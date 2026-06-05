import React from 'react';
import { motion } from 'framer-motion';
import { Users, Layout, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Bell, Clock } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';

export const Dashboard: React.FC = () => {
  const { stats, logs, isEvacuationActive, nodes } = useSimulation();

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

        {/* Congested Areas */}
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
    </motion.div>
  );
};
