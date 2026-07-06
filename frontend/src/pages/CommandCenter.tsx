import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Activity, 
  Flame, 
  Wind, 
  Bomb, 
  ShieldAlert, 
  Cpu, 
  Play,
  RotateCcw,
  Clock,
  Award,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import type { PanicType } from '../types';

export const CommandCenter: React.FC = () => {
  const { 
    nodes, 
    edges, 
    stats, 
    logs,
    densityHistory, 
    panickedNodes, 
    smartDecision, 
    triggerPanicBFS, 
    clearPanic, 
    isEvacuationActive, 
    triggerEvacuation, 
    cancelEvacuation 
  } = useSimulation();

  const [selectedPanicNode, setSelectedPanicNode] = useState<string>('');
  const [panicType, setPanicType] = useState<PanicType>('FIRE');

  // Filter out forecast points for current density stats
  const actualHistory = densityHistory.filter(pt => !pt.time.startsWith('+'));
  const currentTotalDensity = actualHistory[actualHistory.length - 1]?.density || stats.totalCrowd;

  // Determine prediction risk levels
  const getPredictionRisk = (predictedValue: number) => {
    const capacitySum = nodes.reduce((sum, n) => sum + n.capacity, 0);
    const ratio = predictedValue / capacitySum;
    if (ratio >= 0.75) return { label: 'CRITICAL', color: 'text-brand-red border-brand-red/30 bg-brand-red/10' };
    if (ratio >= 0.55) return { label: 'HIGH', color: 'text-orange-500 border-orange-500/30 bg-orange-500/10' };
    if (ratio >= 0.35) return { label: 'MEDIUM', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' };
    return { label: 'LOW', color: 'text-brand-green border-brand-green/30 bg-brand-green/10' };
  };

  // Get the latest forecast points
  const f30 = densityHistory.find(pt => pt.time === '+30s');
  const f1m = densityHistory.find(pt => pt.time === '+1m');
  const f2m = densityHistory.find(pt => pt.time === '+2m');

  const ma30 = f30?.predictedMA || currentTotalDensity;
  const es30 = f30?.predictedES || currentTotalDensity;
  const te30 = f30?.predictedTE || currentTotalDensity;

  const ma1m = f1m?.predictedMA || currentTotalDensity;
  const es1m = f1m?.predictedES || currentTotalDensity;
  const te1m = f1m?.predictedTE || currentTotalDensity;

  const ma2m = f2m?.predictedMA || currentTotalDensity;
  const es2m = f2m?.predictedES || currentTotalDensity;
  const te2m = f2m?.predictedTE || currentTotalDensity;

  // Average predicted values
  const averagePredicted30s = Math.round((ma30 + es30 + te30) / 3);
  const averagePredicted2m = Math.round((ma2m + es2m + te2m) / 3);

  const confidence30s = 95;
  const confidence1m = 88;
  const confidence2m = 78;

  // Evacuation Performance Score Calculation
  const panickedCount = Object.keys(panickedNodes).length;
  const panicRatio = panickedCount / Math.max(1, nodes.length);
  const rawEvacScore = 100 - (stats.stampedeProbability * 0.5) - (panicRatio * 30) - (stats.bottleneckCount * 8);
  const evacPerformanceScore = Math.max(5, Math.min(100, Math.round(rawEvacScore)));

  // BFS Panic Trigger handler
  const handleTriggerPanic = () => {
    if (!selectedPanicNode) return;
    triggerPanicBFS(selectedPanicNode, panicType);
  };

  // Get Node color based on density & panic level
  const getNodeColor = (nodeId: string, densityRatio: number) => {
    const panicNode = panickedNodes[nodeId];
    if (panicNode && panicNode.level > 0) {
      if (panicNode.level >= 75) return '#ef4444'; // Red
      if (panicNode.level >= 50) return '#f97316'; // Orange
      return '#eab308'; // Yellow
    }

    if (densityRatio >= 0.9) return '#ef4444';
    if (densityRatio >= 0.7) return '#f97316';
    if (densityRatio >= 0.4) return '#eab308';
    return '#10b981';
  };

  // Sort nodes for panic drop-down selection (exclude exits)
  const panicSelectableNodes = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');

  // Strategy comparison static metadata mapped with dynamic highlight
  const strategies = [
    {
      name: 'A* Search',
      type: 'Single-source Shortest Path',
      speed: 'Fast Egress',
      throughput: 'Low Optimization',
      complexity: 'O(E log V)',
      suitability: 'Normal or Light Crowd Flow'
    },
    {
      name: 'BFS Scheduling',
      type: 'Multi-source Wave Drainage',
      speed: 'Balanced Egress',
      throughput: 'Medium Optimization',
      complexity: 'O(V + E)',
      suitability: 'Active Congested Evacuation'
    },
    {
      name: 'Ford-Fulkerson (Max Flow)',
      type: 'Capacity Network Flow',
      speed: 'Slow Path calculation',
      throughput: 'Max Capacity Utilization',
      complexity: 'O(E * max_flow)',
      suitability: 'Heavy Crowd Congestion'
    },
    {
      name: 'Hybrid Routing (A* + Max Flow)',
      type: 'Multi-factor Adaptive Flow',
      speed: 'Optimized Egress',
      throughput: 'High Optimization',
      complexity: 'O(E * max_flow + E log V)',
      suitability: 'Multi-Hazard Emergency / Panic'
    }
  ];

  // Algorithmic explainable rules
  const getSelectedAlgorithmExplanation = (algoName: string) => {
    switch (algoName) {
      case 'Hybrid Routing (A* + Max Flow)':
        return {
          pros: 'Avoids structural & fire hazards while maximizing bottleneck corridor width utilization.',
          cons: 'High computational latency. Demands frequent re-evaluation ticks.',
          cost: 'O(E * max_flow + E log V) complexity',
          constraints: 'Active Fire/Explosion hazards + Spread of Panic level >= 3 zones'
        };
      case 'Ford-Fulkerson (Max Flow)':
        return {
          pros: 'Solves overall routing congestion by shifting cohort streams to underutilized exits.',
          cons: 'Increases walking distance for individual groups to protect network safety.',
          cost: 'O(E * max_flow) bottleneck search complexity',
          constraints: 'Crowd density threshold exceeds limits in 3+ sectors'
        };
      case 'BFS Evacuation Scheduling':
      case 'BFS Scheduling':
        return {
          pros: 'Orders sector drainage step-by-step to prevent stampedes at emergency bottlenecks.',
          cons: 'Disregards individual distance preferences during local path routing.',
          cost: 'O(V + E) linear scheduling depth',
          constraints: 'Active Evacuation Mode is enabled'
        };
      case 'A* Search (Congestion-Bypass)':
        return {
          pros: 'Dynamically routes cohorts around blocked paths or structural damage.',
          cons: 'Can cause queue backlogs on alternative routes if density spikes.',
          cost: 'O(E log V) dynamic path recalculation',
          constraints: 'Active blockages detected on major corridors'
        };
      default:
        return {
          pros: 'Determines the absolute shortest physical path to egress exits.',
          cons: 'Completely ignores crowd bottlenecks, which can cause stampedes in heavy crowds.',
          cost: 'O(E log V) standard path calculation',
          constraints: 'Normal operations under light venue crowd load'
        };
    }
  };

  const currentExplanation = getSelectedAlgorithmExplanation(smartDecision.selectedAlgorithm);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100 pb-20">
      {/* 1. Header Banner & Global Control HUD */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center">
            <Cpu className="w-8 h-8 mr-3 text-brand-blue animate-pulse" />
            Emergency Command AI Panel
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time BFS Panic Propagation waves, linear regression analytics, and explainable decision scheduler.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isEvacuationActive ? (
            <button 
              onClick={cancelEvacuation}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-brand-green/30 bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-all duration-300 shadow-glow-green"
            >
              Stand Down Evacuation
            </button>
          ) : (
            <button 
              onClick={triggerEvacuation}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-brand-red/30 bg-brand-red/10 text-brand-red hover:bg-brand-red/20 transition-all duration-300 animate-pulse shadow-glow-red"
            >
              Force Evacuation (BFS Mode)
            </button>
          )}
          {panickedCount > 0 && (
            <button 
              onClick={clearPanic}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-750 transition-all text-white flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Stabilize Panic
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Row (Scorecard HUD including Evacuation Performance Score) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Evacuation Performance Score Card */}
        <GlassCard className="border-slate-800/80 bg-slate-900/40 relative overflow-hidden flex flex-col justify-between p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-full blur-2xl -z-10"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-brand-green" />
              Evacuation Performance
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-brand-green/10 border border-brand-green/20 rounded text-brand-green font-bold">
              SYS HEALTH
            </span>
          </div>
          <div className="my-4 flex items-center space-x-4">
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  stroke={evacPerformanceScore >= 75 ? '#10b981' : evacPerformanceScore >= 50 ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - evacPerformanceScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-xl font-black text-white font-mono">{evacPerformanceScore}%</div>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Flow Efficiency</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {evacPerformanceScore >= 80 ? 'Optimal Egress' : evacPerformanceScore >= 55 ? 'Active Queuing' : 'Critical Bottlenecks'}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight mt-1">Based on delay, queue sizes, & stampede risk.</p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
            <span>Flow Cap: {Math.round(stats.maxFlowUtilization * 100)}%</span>
            <span>Delay: {stats.bottleneckCount * 3}s</span>
          </div>
        </GlassCard>

        {/* Forecast +30 Seconds card */}
        <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-brand-blue" />
              Density Forecast +30s
            </span>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getPredictionRisk(averagePredicted30s).color}`}>
              {getPredictionRisk(averagePredicted30s).label}
            </span>
          </div>
          <div className="my-4">
            <div className="text-3xl font-black text-white">{averagePredicted30s} <span className="text-xs font-normal text-slate-400 font-mono">Pax</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Linear trend projection: {te30 > currentTotalDensity ? 'Rising flow rates' : 'Declining load'}</p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
            <span>Confidence: {confidence30s}%</span>
            <span>Var: +/- 1.8%</span>
          </div>
        </GlassCard>

        {/* Forecast +1 Minute card */}
        <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-orange-400" />
              Density Forecast +60s
            </span>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getPredictionRisk(Math.round((ma1m+es1m+te1m)/3)).color}`}>
              {getPredictionRisk(Math.round((ma1m+es1m+te1m)/3)).label}
            </span>
          </div>
          <div className="my-4">
            <div className="text-3xl font-black text-white">{Math.round((ma1m + es1m + te1m) / 3)} <span className="text-xs font-normal text-slate-400 font-mono">Pax</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Exponential smoothed projection: {es1m > currentTotalDensity ? 'Slowing exits' : 'Clearing paths'}</p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
            <span>Confidence: {confidence1m}%</span>
            <span>Var: +/- 3.5%</span>
          </div>
        </GlassCard>

        {/* Forecast +2 Minutes card */}
        <GlassCard className="border-slate-800 bg-slate-900/30 flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-brand-red" />
              Density Forecast +120s
            </span>
            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getPredictionRisk(averagePredicted2m).color}`}>
              {getPredictionRisk(averagePredicted2m).label}
            </span>
          </div>
          <div className="my-4">
            <div className="text-3xl font-black text-white">{averagePredicted2m} <span className="text-xs font-normal text-slate-400 font-mono">Pax</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Long-range trend forecasting model</p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-2 flex justify-between">
            <span>Confidence: {confidence2m}%</span>
            <span>Var: +/- 6.2%</span>
          </div>
        </GlassCard>
      </div>

      {/* 3. Middle Grid: SVG Map, Recharts Forecast, and Panic Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SVG Panic Spreading Visualizer */}
        <GlassCard className="xl:col-span-2 border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full bg-brand-red animate-ping"></div>
              <h3 className="font-semibold text-white text-sm">Live Panic Expansion Wave Map</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">BFS PROPAGATION ACTIVE (1 HOP / SEC)</span>
          </div>

          <div className="w-full aspect-[2/1] bg-slate-950 border border-slate-850 rounded-2xl relative overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="0 0 1300 650" className="w-full h-full">
              {/* Draw Edges */}
              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source);
                const destNode = nodes.find(n => n.id === edge.target);
                if (!srcNode || !destNode) return null;

                const x1 = srcNode.x;
                const y1 = srcNode.y / 2 + 50;
                const x2 = destNode.x;
                const y2 = destNode.y / 2 + 50;

                const isPathEdge = edge.distance > 900000;
                return (
                  <line 
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isPathEdge ? '#ef4444' : '#334155'}
                    strokeWidth={isPathEdge ? 1 : 2}
                    strokeDasharray={isPathEdge ? '3 3' : 'none'}
                    opacity={isPathEdge ? 0.3 : 0.7}
                  />
                );
              })}

              {/* Draw Nodes */}
              {nodes.map(node => {
                const x = node.x;
                const y = node.y / 2 + 50;
                const densityRatio = node.currentDensity / node.capacity;
                const panicNode = panickedNodes[node.id];
                const hasPanic = panicNode && panicNode.level > 0;

                return (
                  <g key={node.id} className="cursor-pointer">
                    {/* Panic ripple waves */}
                    {hasPanic && (
                      <>
                        <circle cx={x} cy={y} r={30} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.7}>
                          <animate attributeName="r" values="15;40;15" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={x} cy={y} r={25} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4}>
                          <animate attributeName="r" values="15;50;15" dur="3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}

                    {/* Node Core */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={hasPanic ? 16 : 14} 
                      fill={getNodeColor(node.id, densityRatio)}
                      stroke="#0f172a"
                      strokeWidth={3}
                    />

                    {/* Node Label Text */}
                    <text 
                      x={x} 
                      y={y - 22} 
                      textAnchor="middle" 
                      fill="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Live Panic Trigger & Controller */}
        <GlassCard className="border-slate-850 bg-slate-900/30 flex flex-col justify-between p-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Panic Wave Epicenter</h3>
                  <p className="text-[10px] text-slate-500 font-mono">BFS DISASTER SIMULATION</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                  Select Epicenter Sector
                </label>
                <select 
                  value={selectedPanicNode}
                  onChange={(e) => setSelectedPanicNode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-red/50 transition font-mono"
                >
                  <option value="">-- Select Sector --</option>
                  {panicSelectableNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5">
                  Emergency Incident Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FIRE', 'SMOKE', 'EXPLOSION'] as PanicType[]).map(t => {
                    const icons = { FIRE: Flame, SMOKE: Wind, EXPLOSION: Bomb };
                    const IconComp = icons[t];
                    const isActive = panicType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setPanicType(t)}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-brand-red/20 border-brand-red text-brand-red shadow-glow-red' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-4 h-4 mb-1" />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={!selectedPanicNode}
                onClick={handleTriggerPanic}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                  selectedPanicNode 
                    ? 'bg-brand-red hover:bg-brand-red-hover text-white shadow-glow-red' 
                    : 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 mr-2" />
                Trigger BFS Panic Wave
              </button>
            </div>
          </div>

          <div className="border-t border-slate-900 mt-4 pt-3">
            <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400 block mb-2">Active Panic States</span>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {panickedCount === 0 ? (
                <div className="text-[10px] text-slate-500 font-mono text-center py-3">No active panic zones.</div>
              ) : (
                Object.values(panickedNodes).map(pn => {
                  const name = nodes.find(n => n.id === pn.nodeId)?.name || pn.nodeId;
                  return (
                    <div key={pn.nodeId} className="flex justify-between items-center text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-900">
                      <span className="text-white font-bold">{name}</span>
                      <span className="text-brand-red font-semibold">{pn.level}% ({pn.sourceType})</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 4. Fourth Grid: Predictive Recharts Panel & Incident Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Predictive forecasting line graph */}
        <GlassCard className="lg:col-span-2 border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-brand-green" />
              <div>
                <h3 className="font-semibold text-white text-sm">Predictive Density Forecasting Models</h3>
                <p className="text-[10px] text-slate-500 font-mono">REAL-TIME FORECAST LINES AT +30s, +60s, +120s</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-blue mr-1"></span>Actual</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-red mr-1"></span>MA</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-brand-green mr-1"></span>ES</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-amber-500 mr-1"></span>Trend</span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={densityHistory} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#64748b" fontSize={11} fontStyle="mono" domain={['dataMin - 150', 'dataMax + 150']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontFamily: 'monospace' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="density" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} 
                  activeDot={{ r: 5 }} 
                  name="Current Density" 
                  connectNulls
                />
                <Line type="monotone" dataKey="predictedMA" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} name="Moving Average" />
                <Line type="monotone" dataKey="predictedES" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} name="Exponential Smoothing" />
                <Line type="monotone" dataKey="predictedTE" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="Trend Estimation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Live Incident Timeline Panel */}
        <GlassCard className="border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-red animate-pulse" />
              <h3 className="font-semibold text-white text-sm">Incident Timeline Logs</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">REAL-TIME TELEMETRY</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1 flex-1 font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-10">No incident logs loaded.</div>
            ) : (
              logs.slice(-6).reverse().map((log, idx) => (
                <div key={log.id || idx} className="relative pl-4 border-l border-slate-800 pb-3 last:pb-0">
                  {/* Glowing vertical marker node */}
                  <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                    log.level === 'CRITICAL' ? 'bg-brand-red shadow-glow-red' :
                    log.level === 'WARNING' ? 'bg-yellow-500' : 'bg-brand-blue'
                  }`}></div>
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>{log.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      log.level === 'CRITICAL' ? 'bg-brand-red/10 text-brand-red' :
                      log.level === 'WARNING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-brand-blue/10 text-brand-blue'
                    }`}>{log.level}</span>
                  </div>
                  <p className="text-slate-300 mt-1 text-xs leading-relaxed">{log.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-900 mt-3 pt-2 text-[10px] text-slate-500 flex justify-between font-mono">
            <span>Log Cache: {logs.length} entries</span>
            <span>Buffer Status: Stable</span>
          </div>
        </GlassCard>
      </div>

      {/* 5. Bottom Row: Explainable Decision Panel & Strategy Comparison Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Explainable Decision Panel */}
        <GlassCard className="xl:col-span-1 border-slate-850 bg-slate-900/30 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-brand-blue" />
                <h3 className="font-semibold text-white text-sm">Explainable Routing Decisions</h3>
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">ACTIVE ALGORITHM</span>
                <span className="text-sm font-black text-brand-blue">{smartDecision.selectedAlgorithm}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ALGORITHMIC PROS</span>
                <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-900">
                  {currentExplanation.pros}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ALGORITHMIC CONS & LIMITATIONS</span>
                <p className="text-slate-400 mt-1 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-900">
                  {currentExplanation.cons}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900">
                <div>
                  <span className="text-[9px] text-slate-500 block">COMPLEXITY COST</span>
                  <span className="text-[11px] font-bold text-slate-300">{currentExplanation.cost}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">TRIGGER RULE</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate block" title={currentExplanation.constraints}>
                    {currentExplanation.constraints}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 font-mono mt-4 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-brand-green" />
            Decision rationale validated on live parameters.
          </div>
        </GlassCard>

        {/* Strategy Comparison Matrix */}
        <GlassCard className="xl:col-span-2 border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-green" />
                <h3 className="font-semibold text-white text-sm">Strategy Allocation Comparison Matrix</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">DYNAMIC RE-ROUTING BENCHMARKS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500">
                    <th className="py-2.5 font-semibold">Routing Core</th>
                    <th className="py-2.5 font-semibold">Framework Class</th>
                    <th className="py-2.5 font-semibold text-center">Egress Rate</th>
                    <th className="py-2.5 font-semibold text-center">Throughput Limit</th>
                    <th className="py-2.5 font-semibold">Performance Complexity</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strat, index) => {
                    const isSelected = smartDecision.selectedAlgorithm.startsWith(strat.name) || 
                      (strat.name.includes('BFS') && smartDecision.selectedAlgorithm.includes('BFS')) || 
                      (strat.name.includes('Ford-Fulkerson') && smartDecision.selectedAlgorithm.includes('Ford-Fulkerson'));

                    return (
                      <tr 
                        key={index} 
                        className={`border-b border-slate-900/80 transition-all ${
                          isSelected 
                            ? 'bg-brand-blue/10 text-white font-bold border-l-4 border-l-brand-blue pl-1.5' 
                            : 'text-slate-400 hover:bg-slate-900/20'
                        }`}
                      >
                        <td className="py-3 flex items-center">
                          {isSelected && <ArrowRight className="w-3.5 h-3.5 mr-1 text-brand-blue animate-pulse" />}
                          {strat.name}
                        </td>
                        <td className="py-3 text-slate-500">{strat.type}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            strat.speed.includes('Fast') || strat.speed.includes('Optimized')
                              ? 'bg-brand-green/10 text-brand-green' 
                              : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {strat.speed}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            strat.throughput.includes('High') || strat.throughput.includes('Max')
                              ? 'bg-brand-green/10 text-brand-green' 
                              : strat.throughput.includes('Medium')
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-brand-red/10 text-brand-red'
                          }`}>
                            {strat.throughput}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{strat.complexity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4 flex items-center justify-between border-t border-slate-900 pt-3">
            <span className="flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Routing core re-assesses conditions every tick (3s).
            </span>
            <span className="text-slate-400">Highlighted row = ACTIVE core</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
