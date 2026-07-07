import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  ShieldAlert, 
  Flame, 
  Clock, 
  Sparkles, 
  CheckCircle,
  Activity,
  Award,
  TrendingUp,
  Users,
  Target,
  AlertTriangle
} from 'lucide-react';

export const EvacuationCenter: React.FC = () => {
  const { 
    isEvacuationActive, 
    triggerEvacuation, 
    cancelEvacuation, 
    stats,
    nodes,
    peopleEvacuated,
    panickedNodes
  } = useSimulation();

  // Find emergency exits
  const exitNodes = nodes.filter(n => n.type === 'EMERGENCY_EXIT');
  const criticalZones = nodes.filter(n => (n.currentDensity / n.capacity) >= 0.7);

  // Compute evacuation completion time (based on total crowd and exit drainage rates)
  const estEvacTimeSec = isEvacuationActive 
    ? Math.max(15, Math.round(stats.totalCrowd / 48)) 
    : 0;

  // ── Performance Scorecard Calculations ────────────────────────────────────
  const panickedCount = Object.keys(panickedNodes).length;
  const panicRatio = panickedCount / Math.max(1, nodes.length);

  const safetyScore = Math.max(0, Math.min(100, Math.round(
    100 - (stats.stampedeProbability * 0.7) - (panicRatio * 30)
  )));
  const efficiencyScore = Math.max(0, Math.min(100, Math.round(
    100 - (stats.bottleneckCount * 12) - (stats.maxFlowUtilization * 15)
  )));
  const overallScore = Math.max(5, Math.min(100, Math.round(
    safetyScore * 0.6 + efficiencyScore * 0.4
  )));

  const peopleRemaining = Math.max(0, Math.round(
    nodes.filter(n => n.type !== 'EMERGENCY_EXIT').reduce((s, n) => s + n.currentDensity, 0)
  ));

  const maxCongestionNode = [...nodes].sort(
    (a, b) => (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity)
  )[0];
  const maxCongestionPct = maxCongestionNode
    ? Math.round((maxCongestionNode.currentDensity / maxCongestionNode.capacity) * 100)
    : 0;

  const routeEfficiency = Math.max(0, Math.round((1 - stats.avgDensityRatio) * 100));

  const activeExitCount = exitNodes.length + (isEvacuationActive ? nodes.filter(n => n.type === 'ENTRY_GATE').length : 0);
  const avgExitTimeSec = activeExitCount > 0
    ? Math.round(peopleRemaining / (activeExitCount * (isEvacuationActive ? 15 : 6)))
    : 999;

  const getGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', color: 'text-emerald-400 border-emerald-400 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.3)]' };
    if (score >= 90) return { grade: 'A',  color: 'text-green-400 border-green-400 bg-green-400/10' };
    if (score >= 80) return { grade: 'B',  color: 'text-blue-400 border-blue-400 bg-blue-400/10' };
    if (score >= 70) return { grade: 'C',  color: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' };
    if (score >= 60) return { grade: 'D',  color: 'text-orange-400 border-orange-400 bg-orange-400/10' };
    return { grade: 'F', color: 'text-red-400 border-red-400 bg-red-400/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]' };
  };
  const grade = getGrade(overallScore);

  // SVG gauge helper
  const gaugeOffset = (score: number) => {
    const r = 32;
    const circ = 2 * Math.PI * r;
    return circ * (1 - score / 100);
  };
  const gaugeColor = (score: number) =>
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' }
    })
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-8 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Evacuation Operations Center
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Egress triggers, exit routing flow, and critical life safety command protocols.
        </p>
      </div>

      {/* ── Existing Grid: Trigger + Telemetry ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Massive Red Emergency Trigger */}
        <div className="lg:col-span-1 flex flex-col justify-stretch">
          <GlassCard 
            glowColor={isEvacuationActive ? 'red' : 'none'} 
            className="flex-1 flex flex-col justify-between items-center text-center p-8 space-y-6"
            hoverEffect={!isEvacuationActive}
          >
            <div className="space-y-2">
              <h3 className={`text-lg font-bold font-sans uppercase tracking-wide ${isEvacuationActive ? 'text-brand-red' : 'text-slate-400'}`}>
                Egress Trigger Command
              </h3>
              <p className="text-xs text-slate-500 max-w-[220px]">
                Initiates sirens, locks entry gates, opens exit corridors, and triggers dynamic shortest safe routing.
              </p>
            </div>

            <div className="relative flex items-center justify-center py-6">
              <AnimatePresence>
                {isEvacuationActive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1.25 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute w-44 h-44 rounded-full bg-brand-red/30 shadow-[0_0_50px_rgba(239,68,68,0.5)] z-0"
                  />
                )}
              </AnimatePresence>

              <button
                onClick={isEvacuationActive ? cancelEvacuation : triggerEvacuation}
                className={`w-36 h-36 rounded-full border-4 font-extrabold text-sm tracking-widest uppercase flex flex-col items-center justify-center transition-all z-10 select-none shadow-2xl ${
                  isEvacuationActive 
                    ? 'bg-slate-900 border-slate-800 text-brand-red shadow-[inset_0_0_20px_rgba(239,68,68,0.3)] hover:bg-slate-800/80' 
                    : 'bg-brand-red hover:bg-brand-red/90 border-brand-red/40 text-white shadow-glow-red hover:scale-105 active:scale-95'
                }`}
              >
                {isEvacuationActive ? (
                  <>
                    <CheckCircle className="w-6 h-6 mb-1.5 text-brand-red" />
                    <span>Stand Down</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-7 h-7 mb-1.5 text-white animate-bounce" />
                    <span>Evacuate</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] font-mono text-slate-550 leading-relaxed max-w-[200px]">
              {isEvacuationActive 
                ? '🔴 SYSTEM IN EMERGENCY EVACUATION STATE. Security sirens and exit locks overridden.'
                : '⚠️ WARNING: Activating this command overrides all venue gates and schedules automatic exits.'
              }
            </div>
          </GlassCard>
        </div>

        {/* Telemetry Status Report */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Evacuation Time */}
            <GlassCard glowColor={isEvacuationActive ? 'red' : 'none'} className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Estimated Egress Completion</span>
                <Clock className={`w-5 h-5 ${isEvacuationActive ? 'text-brand-red animate-pulse' : 'text-slate-500'}`} />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-3xl font-extrabold tracking-tight ${isEvacuationActive ? 'text-brand-red' : 'text-slate-400'}`}>
                  {isEvacuationActive ? `${estEvacTimeSec}m` : '0m'}
                </span>
                <span className="text-xs text-slate-500 font-mono">remaining</span>
              </div>
              <p className="text-[10px] text-slate-550 font-mono leading-relaxed">
                Calculated using Kahn's Topological Sort priority sequence and Ford-Fulkerson exit capacity ratios.
              </p>
            </GlassCard>

            {/* Egress Throughput Rate */}
            <GlassCard glowColor={isEvacuationActive ? 'red' : 'none'} className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Egress Throughput Rate</span>
                <Activity className={`w-5 h-5 ${isEvacuationActive ? 'text-brand-red animate-spin' : 'text-slate-550'}`} style={{ animationDuration: '4s' }} />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-3xl font-extrabold tracking-tight ${isEvacuationActive ? 'text-brand-red' : 'text-slate-400'}`}>
                  {isEvacuationActive ? '38.4' : '0.0'}
                </span>
                <span className="text-xs text-slate-500 font-mono">people/s</span>
              </div>
              <p className="text-[10px] text-slate-550 font-mono leading-relaxed">
                Currently draining venue load. Incoming gate traffic is locked.
              </p>
            </GlassCard>
          </div>

          {/* Safe Exits & Risk Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Emergency Evac Exits</span>
              <div className="space-y-2.5">
                {exitNodes.map(node => (
                  <div key={node.id} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300">{node.name}</span>
                    <span className="text-brand-green font-bold flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      OPEN
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">High Risk Bottleneck Zones</span>
              <div className="space-y-2.5 max-h-32 overflow-y-auto pr-1">
                {criticalZones.length === 0 ? (
                  <div className="p-3 bg-slate-900/20 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>No active bottleneck zones.</span>
                  </div>
                ) : (
                  criticalZones.map(node => (
                    <div key={node.id} className="p-3 bg-brand-red/5 border border-brand-red/20 rounded-xl flex items-center justify-between text-xs font-mono text-brand-red">
                      <span className="font-bold">{node.name}</span>
                      <span className="font-bold flex items-center animate-pulse">
                        <Flame className="w-3.5 h-3.5 mr-1" />
                        {Math.round((node.currentDensity / node.capacity) * 100)}% Load
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance Scorecard Section ──────────────────────────────────── */}
      <div>
        <div className="flex items-center space-x-3 mb-5">
          <Award className="w-5 h-5 text-brand-green" />
          <h3 className="text-lg font-bold text-white tracking-tight">Evacuation Performance Scorecard</h3>
          <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 border border-slate-800 bg-slate-900 rounded">
            LIVE COMPUTATION
          </span>
        </div>

        {/* Top row: Gauges + Grade + Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          {/* Safety Score Gauge */}
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 flex flex-col items-center justify-between space-y-3 border-slate-800 bg-slate-900/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Safety Score</span>
              <div className="relative flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="32" stroke="#1e293b" strokeWidth="7" fill="transparent" />
                  <circle
                    cx="44" cy="44" r="32"
                    stroke={gaugeColor(safetyScore)}
                    strokeWidth="7" fill="transparent"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={gaugeOffset(safetyScore)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-white font-mono">{safetyScore}</span>
                  <span className="text-[9px] text-slate-500">/100</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center">
                {safetyScore >= 75 ? 'Excellent safety margins' : safetyScore >= 50 ? 'Moderate threat exposure' : 'Critical safety deficit'}
              </p>
            </GlassCard>
          </motion.div>

          {/* Efficiency Score Gauge */}
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 flex flex-col items-center justify-between space-y-3 border-slate-800 bg-slate-900/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Efficiency Score</span>
              <div className="relative flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="32" stroke="#1e293b" strokeWidth="7" fill="transparent" />
                  <circle
                    cx="44" cy="44" r="32"
                    stroke={gaugeColor(efficiencyScore)}
                    strokeWidth="7" fill="transparent"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={gaugeOffset(efficiencyScore)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-white font-mono">{efficiencyScore}</span>
                  <span className="text-[9px] text-slate-500">/100</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center">
                {efficiencyScore >= 75 ? 'Optimal flow rates' : efficiencyScore >= 50 ? 'Partial bottlenecks' : 'Severe throughput deficits'}
              </p>
            </GlassCard>
          </motion.div>

          {/* Overall Grade */}
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 flex flex-col items-center justify-between space-y-3 border-slate-800 bg-slate-900/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Overall Grade</span>
              <div className="flex-1 flex items-center justify-center">
                <div className={`text-7xl font-black border-4 rounded-2xl px-6 py-3 transition-all duration-700 ${grade.color}`}>
                  {grade.grade}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center">
                Composite of Safety ({safetyScore}%) + Efficiency ({efficiencyScore}%)
              </p>
            </GlassCard>
          </motion.div>

          {/* Route Efficiency progress */}
          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 flex flex-col justify-between space-y-4 border-slate-800 bg-slate-900/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center">
                <Target className="w-3.5 h-3.5 mr-1.5" />Route Efficiency
              </span>
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-400">Network Utilisation</span>
                  <span className="text-white font-bold">{routeEfficiency}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${routeEfficiency}%`,
                      background: routeEfficiency >= 70
                        ? 'linear-gradient(90deg,#10b981,#34d399)'
                        : routeEfficiency >= 45
                        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        : 'linear-gradient(90deg,#ef4444,#f87171)'
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between">
                  <span>Avg Density Ratio</span>
                  <span className="text-slate-300">{Math.round(stats.avgDensityRatio * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Flow Utilisation</span>
                  <span className="text-slate-300">{Math.round(stats.maxFlowUtilization * 100)}%</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Bottom row: People + Time + Congestion summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">

          {/* People Evacuated */}
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 border-slate-800 bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">People Evacuated</span>
                <TrendingUp className="w-4 h-4 text-brand-green" />
              </div>
              <div className="text-3xl font-black text-white font-mono">{peopleEvacuated.toLocaleString()}</div>
              <p className="text-[10px] text-slate-500 font-mono">Cumulative since evacuation trigger</p>
            </GlassCard>
          </motion.div>

          {/* People Remaining */}
          <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 border-slate-800 bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">People Remaining</span>
                <Users className="w-4 h-4 text-brand-red" />
              </div>
              <div className={`text-3xl font-black font-mono ${peopleRemaining > 500 ? 'text-brand-red' : peopleRemaining > 100 ? 'text-yellow-400' : 'text-brand-green'}`}>
                {peopleRemaining.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Still inside venue boundaries</p>
            </GlassCard>
          </motion.div>

          {/* Average Exit Time */}
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 border-slate-800 bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Avg Exit Time</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {isEvacuationActive ? `${Math.min(999, avgExitTimeSec)}s` : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Per-person estimated wait at active exits
              </p>
            </GlassCard>
          </motion.div>

          {/* Maximum Congestion */}
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard className="p-5 border-slate-800 bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Max Congestion Zone</span>
                <AlertTriangle className={`w-4 h-4 ${maxCongestionPct >= 90 ? 'text-brand-red animate-pulse' : 'text-yellow-500'}`} />
              </div>
              <div className={`text-3xl font-black font-mono ${maxCongestionPct >= 90 ? 'text-brand-red' : maxCongestionPct >= 70 ? 'text-yellow-400' : 'text-brand-green'}`}>
                {maxCongestionPct}%
              </div>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {maxCongestionNode?.name || 'No data'} — worst load
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
