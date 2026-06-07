import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, MapPin, Users, Layout, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Bell, Clock } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { findSafestPathAStar } from '../utils/algorithms';

export const Dashboard: React.FC = () => {
  const { stats, logs, isEvacuationActive, nodes, edges, densityThreshold } = useSimulation();

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  // Get most recent warning/critical logs
  const recentAlerts = logs
    .filter(log => log.level !== 'INFO')
    .slice(-4)
    .reverse();

  // Find the highest density node
  const peakNode = [...nodes].sort((a, b) => 
    (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity)
  )[0];

  // Find Entry Gates and Emergency Exits
  const gates = nodes.filter(n => n.type === 'ENTRY_GATE');
  const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT');

  // Compute safest egress route for each gate dynamically
  const safestRoutes = gates.map(gate => {
    let bestPath: string[] = [];
    let bestCost = Infinity;
    let bestExitName = '';

    exits.forEach(exit => {
      const res = findSafestPathAStar(nodes, edges, gate.id, exit.id);
      if (res.path.length > 0 && res.totalCost < bestCost) {
        bestCost = res.totalCost;
        bestPath = res.path;
        bestExitName = exit.name;
      }
    });

    return {
      gateId: gate.id,
      gateName: gate.name,
      bestExitName,
      path: bestPath,
      cost: bestCost
    };
  });

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [showCongestedModal, setShowCongestedModal] = useState(false);

  // All nodes that are currently over the density threshold
  const congestedNodes = nodes
    .filter(n => (n.currentDensity / n.capacity) * 100 >= densityThreshold)
    .sort((a, b) => (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity));

  // For each congested node compute A* bypassing that node
  const alternatePathSuggestions = congestedNodes.slice(0, 6).map(congestedNode => {
    const bypassEdges = edges.filter(
      e => e.target !== congestedNode.id && e.source !== congestedNode.id
    );
    let bestPath: string[] = [];
    let bestCost = Infinity;
    let bestGateName = '';
    let bestExitName = '';
    gates.forEach(gate => {
      exits.forEach(exit => {
        const res = findSafestPathAStar(nodes, bypassEdges, gate.id, exit.id);
        if (res.path.length > 0 && res.totalCost < bestCost) {
          bestCost = res.totalCost;
          bestPath = res.path;
          bestGateName = gate.name;
          bestExitName = exit.name;
        }
      });
    });
    return {
      id: congestedNode.id,
      name: congestedNode.name,
      densityRatio: congestedNode.currentDensity / congestedNode.capacity,
      currentDensity: congestedNode.currentDensity,
      capacity: congestedNode.capacity,
      alternatePath: bestPath,
      alternateCost: bestCost,
      bestGateName,
      bestExitName,
    };
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="space-y-8 p-8 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Dashboard Overview
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Real-time telemetry and crowd operations intelligence.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Crowd */}
        <GlassCard 
          glowColor={isEvacuationActive ? 'red' : stats.totalCrowd > 1500 ? 'orange' : 'blue'}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-slate-500 block mb-1">Total Crowd</span>
              <span className="text-3xl font-bold text-white tracking-tight">{stats.totalCrowd}</span>
            </div>
            <div className={`p-3 rounded-xl ${isEvacuationActive ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-blue/10 text-brand-blue'}`}>
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-[11px] font-mono">
            {isEvacuationActive ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-brand-red" />
                <span className="text-brand-red font-semibold">Evacuating...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
                <span className="text-brand-green font-semibold">+8.4% /min</span>
                <span className="text-slate-500">vs last cycle</span>
              </>
            )}
          </div>
        </GlassCard>

        {/* Active Zones */}
        <GlassCard glowColor="none">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-slate-500 block mb-1">Active Zones</span>
              <span className="text-3xl font-bold text-white tracking-tight">{stats.activeZones}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
              <Layout className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-[11px] font-mono text-slate-400">
            <span className="text-brand-green font-semibold">100%</span>
            <span>coverage operational</span>
          </div>
        </GlassCard>

        {/* Congested Areas — clickable to show modal */}
        <div
          onClick={() => stats.congestedAreas > 0 && setShowCongestedModal(true)}
          className={`transition-all duration-200 rounded-2xl ${stats.congestedAreas > 0 ? 'cursor-pointer hover:scale-[1.025] hover:brightness-110' : ''}`}
          title={stats.congestedAreas > 0 ? 'Click to view congested zones' : undefined}
        >
          <GlassCard glowColor={stats.congestedAreas > 0 ? 'orange' : 'green'}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-slate-500 block mb-1">Congested Areas</span>
                <span className="text-3xl font-bold text-white tracking-tight">{stats.congestedAreas}</span>
              </div>
              <div className={`p-3 rounded-xl ${
                stats.congestedAreas > 0 ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-green/10 text-brand-green'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-4 text-[11px] font-mono">
              {stats.congestedAreas > 0 ? (
                <>
                  <span className="text-brand-orange font-semibold">{stats.congestedAreas} zones</span>
                  <span className="text-slate-500">exceed warning cap</span>
                  <span className="ml-auto text-[9px] font-mono text-brand-blue/70 border border-brand-blue/20 px-1.5 py-0.5 rounded-md">↗ details</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-brand-green font-semibold">Optimal</span>
                  <span className="text-slate-500">flow distribution</span>
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Risk Score */}
        <GlassCard glowColor={stats.riskScore >= 75 ? 'red' : stats.riskScore >= 45 ? 'orange' : 'green'}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-slate-500 block mb-1">System Risk Score</span>
              <span className="text-3xl font-bold text-white tracking-tight">{stats.riskScore}%</span>
            </div>
            <div className={`p-3 rounded-xl ${
              stats.riskScore >= 75 ? 'bg-brand-red/10 text-brand-red animate-pulse' : stats.riskScore >= 45 ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-green/10 text-brand-green'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 mt-4 text-[11px] font-mono">
            {stats.riskScore >= 75 ? (
              <span className="text-brand-red font-semibold animate-pulse">CRITICAL THRESHOLD REACHED</span>
            ) : stats.riskScore >= 45 ? (
              <span className="text-brand-orange font-semibold">MODERATE LOAD</span>
            ) : (
              <span className="text-brand-green font-semibold">SAFE OPERATION MODE</span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight font-sans flex items-center space-x-2">
            <Bell className="w-5 h-5 text-brand-blue" />
            <span>Active Incident log</span>
          </h3>

          <div className="glass-panel rounded-2xl border-slate-800/60 p-6 min-h-[320px] flex flex-col justify-between">
            <div className="space-y-4">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs space-y-2">
                  <ShieldCheck className="w-8 h-8 text-brand-green" />
                  <span>No security or density incidents reported.</span>
                </div>
              ) : (
                recentAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`flex items-start space-x-3.5 p-3 rounded-xl border ${
                      alert.level === 'CRITICAL' 
                        ? 'bg-brand-red/5 border-brand-red/20 text-brand-red' 
                        : 'bg-brand-orange/5 border-brand-orange/20 text-brand-orange'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase font-mono">{alert.level}</span>
                        <span className="text-[10px] opacity-60 font-mono">{alert.timestamp}</span>
                      </div>
                      <p className="text-xs font-sans text-slate-200 mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Security Logging Status: ACTIVE</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Last scan complete</span>
              </span>
            </div>
          </div>
        </div>

        {/* Peak Bottleneck Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight font-sans flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-brand-orange" />
            <span>System Bottleneck</span>
          </h3>

          <GlassCard glowColor={peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.7 ? 'orange' : 'none'} className="min-h-[320px] flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">Peak Occupancy Zone</span>
              <h4 className="text-2xl font-bold text-white tracking-tight mb-2">
                {peakNode ? peakNode.name : 'N/A'}
              </h4>
              
              <div className="space-y-4 mt-6">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span>Density Ratio</span>
                    <span className="font-semibold text-slate-200">
                      {peakNode ? Math.round((peakNode.currentDensity / peakNode.capacity) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.9 
                          ? 'bg-brand-red' 
                          : peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.7 
                          ? 'bg-brand-orange' 
                          : 'bg-brand-blue'
                      }`}
                      style={{ width: `${peakNode ? Math.round((peakNode.currentDensity / peakNode.capacity) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block">Density</span>
                    <span className="font-bold text-slate-300">{peakNode ? Math.round(peakNode.currentDensity) : 0} /m²</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Capacity</span>
                    <span className="font-bold text-slate-300">{peakNode ? peakNode.capacity : 0} cap</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900 mt-4 font-mono">
              {peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.9 
                ? '⚠️ CRITICAL: Zone is over capacity. Evacuation routing highly recommended to distribute load.'
                : peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.7
                ? '⚠️ WARNING: High crowd density. Recommended route optimization checks.'
                : '✅ NORMAL: Dynamic load remains within safety parameters.'
              }
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Safest Egress Routes Panel */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white tracking-tight font-sans flex items-center space-x-2">
          <Compass className="w-5 h-5 text-brand-blue" />
          <span>Dynamic Egress Routes & Pathway Status</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {safestRoutes.map(route => {
            const hasPath = route.path.length > 0;
            const pathRisk = route.path.reduce((max, nodeId) => {
              const node = nodes.find(n => n.id === nodeId);
              if (!node) return max;
              const ratio = node.currentDensity / node.capacity;
              if (ratio >= 0.9) return 'CRITICAL';
              if (ratio >= 0.7 && max !== 'CRITICAL') return 'HIGH';
              if (ratio >= 0.5 && max !== 'CRITICAL' && max !== 'HIGH') return 'MODERATE';
              return max;
            }, 'SAFE');

            const riskTextColors = {
              SAFE: 'text-brand-green bg-brand-green/10 border-brand-green/20',
              MODERATE: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
              HIGH: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20',
              CRITICAL: 'text-brand-red bg-brand-red/10 border-brand-red/20 animate-pulse'
            };

            return (
              <GlassCard key={route.gateId} glowColor={pathRisk === 'CRITICAL' ? 'red' : pathRisk === 'HIGH' ? 'orange' : 'none'} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs font-bold text-slate-200 uppercase font-mono">{route.gateName}</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold">
                    {hasPath ? (
                      <span className={`px-2 py-0.5 rounded-md border ${riskTextColors[pathRisk as keyof typeof riskTextColors]}`}>
                        {pathRisk} RISK
                      </span>
                    ) : (
                      <span className="text-brand-red bg-brand-red/10 border-brand-red/20 px-2 py-0.5 rounded-md border">UNREACHABLE</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400">
                    Optimal Target: <span className="text-slate-200 font-bold">{route.bestExitName || 'N/A'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Route Cost Score: <span className="text-brand-blue font-bold">{hasPath ? Math.round(route.cost) : 'Infinity'}</span>
                  </div>
                </div>

                {/* Horizontal path chain visualizer */}
                {hasPath && (
                  <div className="pt-2 flex items-center space-x-1.5 overflow-x-auto pr-2 pb-1 scrollbar-thin">
                    {route.path.map((nodeId, index) => {
                      const node = nodes.find(n => n.id === nodeId);
                      if (!node) return null;
                      const ratio = node.currentDensity / node.capacity;
                      let dotColor = 'bg-brand-green border-brand-green/35 shadow-glow-green';
                      if (ratio >= 0.9) dotColor = 'bg-brand-red border-brand-red/35 shadow-glow-red animate-pulse';
                      else if (ratio >= 0.7) dotColor = 'bg-brand-orange border-brand-orange/35 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
                      else if (ratio >= 0.5) dotColor = 'bg-amber-500 border-amber-500/35';

                      return (
                        <div key={nodeId} className="flex items-center space-x-1 shrink-0">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[8px] font-mono font-bold text-white transition-all ${dotColor}`}
                              title={`${node.name} (${Math.round(ratio * 100)}% load)`}
                            >
                              {nodeId.substring(0, 3).replace('_', '')}
                            </div>
                            <span className="text-[8px] font-mono text-slate-500 mt-1 tracking-tighter">
                              {nodeId.replace(/Gate_|Hall_|Corridor_|Exit_/, '')}
                            </span>
                          </div>
                          {index < route.path.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-700 animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── Congestion Relief Recommendations ──────────────────────────────── */}
      {alternatePathSuggestions.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans tracking-tight">Congestion Relief Recommendations</h3>
              <p className="text-[11px] font-mono text-slate-500">A* bypass routes computed excluding each overloaded zone</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {alternatePathSuggestions.map(suggestion => {
              const densityPct = Math.min(100, Math.round(suggestion.densityRatio * 100));
              const isCritical = suggestion.densityRatio >= 0.9;
              const hasAlternate = suggestion.alternatePath.length > 0;
              return (
                <GlassCard key={suggestion.id} glowColor={isCritical ? 'red' : 'orange'}>
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-brand-red animate-pulse' : 'bg-brand-orange'}`} />
                      <span className="text-xs font-bold text-slate-100 font-sans">{suggestion.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isCritical
                        ? 'text-brand-red bg-brand-red/10 border-brand-red/25 animate-pulse'
                        : 'text-brand-orange bg-brand-orange/10 border-brand-orange/25'
                    }`}>
                      {densityPct}% FULL
                    </span>
                  </div>

                  {/* Density bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span>Occupancy</span>
                      <span className="text-slate-300">{Math.round(suggestion.currentDensity)} / {suggestion.capacity} people</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-brand-red' : 'bg-brand-orange'}`}
                        style={{ width: `${densityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Bypass route */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <Compass className="w-3 h-3 text-brand-blue" />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Bypass Route</span>
                      {hasAlternate && (
                        <span className="text-[10px] font-mono text-brand-blue ml-auto">
                          {suggestion.bestGateName} → {suggestion.bestExitName}
                        </span>
                      )}
                    </div>

                    {hasAlternate ? (
                      <div className="flex items-center flex-wrap gap-1 pt-1">
                        {suggestion.alternatePath.map((nodeId, idx) => {
                          const n = nodes.find(nd => nd.id === nodeId);
                          if (!n) return null;
                          const r = n.currentDensity / n.capacity;
                          let bg = 'bg-brand-green/20 border-brand-green/30 text-brand-green';
                          if (r >= 0.9) bg = 'bg-brand-red/20 border-brand-red/30 text-brand-red';
                          else if (r >= 0.7) bg = 'bg-brand-orange/20 border-brand-orange/30 text-brand-orange';
                          else if (r >= 0.5) bg = 'bg-amber-500/20 border-amber-500/30 text-amber-400';
                          const shortLabel = n.name.length > 9 ? n.name.substring(0, 9) + '…' : n.name;
                          return (
                            <React.Fragment key={nodeId}>
                              <div
                                className={`flex flex-col items-center px-2 py-1 rounded-lg border text-[8px] font-mono font-bold ${bg}`}
                                title={`${n.name} — ${Math.round(r * 100)}% load`}
                              >
                                <span>{shortLabel}</span>
                                <span className="opacity-60">{Math.round(r * 100)}%</span>
                              </div>
                              {idx < suggestion.alternatePath.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-slate-700" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-mono text-brand-red/80 pt-1">
                        No viable bypass — all surrounding routes are congested.
                      </p>
                    )}

                    {hasAlternate && (
                      <p className="text-[10px] font-mono text-slate-500 pt-1">
                        Route cost: <span className="text-slate-300">{Math.round(suggestion.alternateCost)}</span>
                        {' · '}{suggestion.alternatePath.length} hops
                      </p>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Congested Areas Modal ────────────────────────────────────────────── */}
      {showCongestedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
          onClick={() => setShowCongestedModal(false)}
        >
          <div
            className="glass-panel border border-brand-orange/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-brand-orange/10">
                  <AlertTriangle className="w-4 h-4 text-brand-orange" />
                </div>
                <h3 className="text-sm font-bold text-white font-sans">Congested Zones</h3>
                <span className="text-[10px] font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded-full">
                  {congestedNodes.length} active
                </span>
              </div>
              <button
                onClick={() => setShowCongestedModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
              {congestedNodes.length === 0 ? (
                <div className="flex flex-col items-center py-10 space-y-2 text-slate-500">
                  <ShieldCheck className="w-9 h-9 text-brand-green" />
                  <span className="text-xs font-mono">All zones within safe capacity.</span>
                </div>
              ) : (
                congestedNodes.map(node => {
                  const ratio = node.currentDensity / node.capacity;
                  const pct = Math.min(100, Math.round(ratio * 100));
                  const crit = ratio >= 0.9;
                  return (
                    <div
                      key={node.id}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        crit
                          ? 'bg-brand-red/5 border-brand-red/20'
                          : 'bg-brand-orange/5 border-brand-orange/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${crit ? 'bg-brand-red animate-pulse' : 'bg-brand-orange'}`} />
                          <span className={`text-xs font-bold font-sans ${crit ? 'text-brand-red' : 'text-brand-orange'}`}>
                            {node.name}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          crit ? 'text-brand-red bg-brand-red/10 border-brand-red/20' : 'text-brand-orange bg-brand-orange/10 border-brand-orange/20'
                        }`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${crit ? 'bg-brand-red' : 'bg-brand-orange'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{node.type.replace(/_/g, ' ')}</span>
                        <span>{Math.round(node.currentDensity)} / {node.capacity} people</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-900/30">
              <p className="text-[10px] font-mono text-slate-500 text-center">
                Scroll down on dashboard to see A*-computed bypass routes
              </p>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
};
