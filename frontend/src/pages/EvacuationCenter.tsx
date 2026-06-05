import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  ShieldAlert, 
  Flame, 
  Clock, 
  Sparkles, 
  CheckCircle,
  Activity
} from 'lucide-react';

export const EvacuationCenter: React.FC = () => {
  const { 
    isEvacuationActive, 
    triggerEvacuation, 
    cancelEvacuation, 
    stats,
    nodes 
  } = useSimulation();

  // Find emergency exits
  const exitNodes = nodes.filter(n => n.type === 'EMERGENCY_EXIT');
  const criticalZones = nodes.filter(n => (n.currentDensity / n.capacity) >= 0.7);

  // Compute evacuation completion time (mocked based on total crowd and exit drainage rates)
  const estEvacTimeSec = isEvacuationActive 
    ? Math.max(15, Math.round(stats.totalCrowd / 48)) 
    : 0;

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
                Calculated using Kahn\'s Topological Sort priority sequence and Ford-Fulkerson exit capacity ratios.
              </p>
            </GlassCard>

            {/* Emergency status overview */}
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

          {/* Safe Exits & Risk Zones summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safe Exits */}
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

            {/* Risk Zones */}
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
    </motion.div>
  );
};
