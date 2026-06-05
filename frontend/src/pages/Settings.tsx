import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  MapPin, 
  Layers, 
  Sparkles,
  GitFork,
  CheckCircle2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    nodes, 
    edges, 
    injectCrowd, 
    resetSimulation 
  } = useSimulation();

  const [selectedNode, setSelectedNode] = useState('Gate_A');
  const [injectAmt, setInjectAmt] = useState(100);
  const [successMsg, setSuccessMsg] = useState('');

  const handleInject = () => {
    injectCrowd(selectedNode, injectAmt);
    const nodeObj = nodes.find(n => n.id === selectedNode);
    setSuccessMsg(`Successfully injected ${injectAmt} people at ${nodeObj?.name || selectedNode}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Preset scenarios handlers
  const applyScenario = (type: 'concert' | 'squeeze' | 'normal') => {
    resetSimulation();
    
    // Slight delay to allow reset state to propagate
    setTimeout(() => {
      if (type === 'concert') {
        injectCrowd('Gate_A', 300);
        injectCrowd('Gate_B', 300);
        injectCrowd('Hall_1', 150);
        setSuccessMsg('Applied "Concert Preset Scenario": High gate load and entry hallways.');
      } else if (type === 'squeeze') {
        injectCrowd('Corridor_1', 260);
        injectCrowd('Hall_1', 400);
        injectCrowd('Hall_2', 300);
        setSuccessMsg('Applied "Corridor Squeeze Scenario": Highly congested bottleneck hallway.');
      } else if (type === 'normal') {
        setSuccessMsg('Applied "Normal Operation Scenario": Reset to default safe loads.');
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 100);
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
          Venue Settings & Presets
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Apply simulation presets, adjust capacities, and inject manual crowd.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Influx Control */}
        <div className="space-y-6">
          <GlassCard glowColor="none" className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <MapPin className="w-4 h-4 mr-1.5 text-brand-blue" />
              <span>Manual Crowd Influx</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500">Select Target Zone</label>
                <select
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-sm focus:outline-none focus:border-brand-blue/60 transition-colors"
                >
                  {nodes.filter(n => n.type !== 'EMERGENCY_EXIT').map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-500">Injection Capacity (People)</label>
                <select
                  value={injectAmt}
                  onChange={(e) => setInjectAmt(parseInt(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-sm focus:outline-none focus:border-brand-blue/60 transition-colors"
                >
                  <option value={50}>50 people</option>
                  <option value={100}>100 people</option>
                  <option value={200}>200 people</option>
                  <option value={350}>350 people</option>
                </select>
              </div>

              <button
                onClick={handleInject}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl py-3.5 transition-colors flex items-center justify-center space-x-2 mt-2"
              >
                <Layers className="w-4 h-4 text-brand-blue" />
                <span>Inject Telemetry Load</span>
              </button>

              {/* Status Message Overlay */}
              {successMsg && (
                <div className="p-3 bg-brand-green/5 border border-brand-green/20 text-brand-green text-[11px] font-mono rounded-xl flex items-center space-x-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Preset Scenario Panels */}
          <GlassCard glowColor="none" className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-brand-orange" />
              <span>Preset Scenarios</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <button
                onClick={() => applyScenario('concert')}
                className="w-full p-4 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 hover:border-brand-blue/30 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-250 group-hover:text-white block mb-0.5">Concert Egress Preset</span>
                  <span className="text-[10px] text-slate-500">Injects high crowd densities at gate entries and hallways.</span>
                </div>
                <span className="text-brand-blue font-bold">APPLY</span>
              </button>

              <button
                onClick={() => applyScenario('squeeze')}
                className="w-full p-4 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 hover:border-brand-orange/30 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-250 group-hover:text-white block mb-0.5">Corridor Squeeze bottleneck</span>
                  <span className="text-[10px] text-slate-500">Clogs corridor 1 to simulate path rerouting.</span>
                </div>
                <span className="text-brand-orange font-bold">APPLY</span>
              </button>

              <button
                onClick={() => applyScenario('normal')}
                className="w-full p-4 rounded-xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 hover:border-brand-green/30 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-slate-250 group-hover:text-white block mb-0.5">Normal safe Day</span>
                  <span className="text-[10px] text-slate-500">Resets load values to default operating capacity.</span>
                </div>
                <span className="text-brand-green font-bold">APPLY</span>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Corridor Capacities */}
        <div className="space-y-6">
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <GitFork className="w-4 h-4 mr-1.5 text-brand-blue" />
              <span>Corridor Capacity Telemetry</span>
            </h3>

            <div className="space-y-3 font-mono text-[11px] max-h-[465px] overflow-y-auto pr-1">
              {edges.map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const dest = nodes.find(n => n.id === edge.target);

                return (
                  <div key={edge.id} className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-300">{edge.id}</span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{src?.name} ➔ {dest?.name}</div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400">Cap Limit:</span>
                      <span className="font-bold text-brand-blue">{edge.capacity} p/s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
