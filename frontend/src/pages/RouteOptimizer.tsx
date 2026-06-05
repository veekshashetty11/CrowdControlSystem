import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  Compass, 
  Clock, 
  ShieldAlert, 
  Play, 
  Cpu 
} from 'lucide-react';

export const RouteOptimizer: React.FC = () => {
  const { nodes, calculateRoute, selectedPath, activeAlgorithm } = useSimulation();

  const [source, setSource] = useState('Gate_A');
  const [destination, setDestination] = useState('Exit_A');
  const [isAnimating, setIsAnimating] = useState(false);

  // Filter nodes for dropdowns
  const nodeOptions = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');
  const exitOptions = nodes.filter(n => n.type === 'EMERGENCY_EXIT');

  // Trigger A* calculation
  const handleCalculate = () => {
    setIsAnimating(true);
    calculateRoute(source, destination);
    setTimeout(() => {
      setIsAnimating(false);
    }, 1500); // Animation duration
  };

  // Compute metrics based on A* path
  const pathNodes = selectedPath.map(id => nodes.find(n => n.id === id)).filter(Boolean);
  const pathCost = activeAlgorithm && activeAlgorithm.name.includes('A*') ? activeAlgorithm.executionTime * 100 : 0; // arbitrary metric

  // Find max risk level on the path
  const maxRisk = pathNodes.reduce((max, node) => {
    if (!node) return max;
    const ratio = node.currentDensity / node.capacity;
    if (ratio >= 0.9) return 'CRITICAL';
    if (ratio >= 0.7 && max !== 'CRITICAL') return 'HIGH';
    if (ratio >= 0.5 && max !== 'CRITICAL' && max !== 'HIGH') return 'MODERATE';
    return max;
  }, 'SAFE');

  const riskColors = {
    SAFE: 'text-brand-green bg-brand-green/10 border-brand-green/20',
    MODERATE: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    HIGH: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20',
    CRITICAL: 'text-brand-red bg-brand-red/10 border-brand-red/20 animate-pulse',
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
          Congestion-Aware Route Optimizer
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Applies A* Search with dynamic edge penalty weighting to locate safest exit vectors.
        </p>
      </div>

      {/* Inputs and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard glowColor="none" className="space-y-6 lg:col-span-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <Compass className="w-4 h-4 mr-1.5 text-brand-blue" />
            <span>Route Parameters</span>
          </h3>

          <div className="space-y-4">
            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> Source Location
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-sm focus:outline-none focus:border-brand-blue/60 transition-colors"
              >
                {nodeOptions.map(n => (
                  <option key={n.id} value={n.id} className="bg-slate-950">{n.name} ({n.id})</option>
                ))}
              </select>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-500 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> Destination Exit
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-sm focus:outline-none focus:border-brand-blue/60 transition-colors"
              >
                {exitOptions.map(n => (
                  <option key={n.id} value={n.id} className="bg-slate-950">{n.name} ({n.id})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculate}
              disabled={isAnimating}
              className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:bg-brand-blue/50 text-white font-semibold text-sm rounded-xl py-3.5 shadow-glow-blue transition-all flex items-center justify-center space-x-2 mt-2"
            >
              <Navigation className={`w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`} />
              <span>{isAnimating ? 'Computing Paths...' : 'Calculate Safest Route'}</span>
            </button>
          </div>
        </GlassCard>

        {/* Route Output Screen */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
            Optimized Output vectors
          </h3>

          <AnimatePresence mode="wait">
            {selectedPath.length > 0 && activeAlgorithm ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel border-slate-800/60 rounded-2xl p-6 min-h-[295px] flex flex-col justify-between"
              >
                {/* Top overview stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-800/60 font-mono text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                    <span className="text-slate-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Est. Time</span>
                    <span className="text-base font-bold text-slate-200">
                      {Math.round(pathNodes.length * 15 + pathCost * 0.1)} seconds
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                    <span className="text-slate-500 flex items-center"><Compass className="w-3.5 h-3.5 mr-1" /> Distance</span>
                    <span className="text-base font-bold text-slate-200">
                      {pathNodes.length * 120} meters
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                    <span className="text-slate-500 flex items-center"><ShieldAlert className="w-3.5 h-3.5 mr-1 text-brand-orange" /> Route Risk</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border text-center font-sans ${riskColors[maxRisk as keyof typeof riskColors]}`}>
                      {maxRisk}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                    <span className="text-slate-500 flex items-center"><Cpu className="w-3.5 h-3.5 mr-1 text-brand-blue" /> Visited</span>
                    <span className="text-base font-bold text-slate-200">
                      {activeAlgorithm.visitedNodes.length} nodes
                    </span>
                  </div>
                </div>

                {/* Path Traversal Timeline Visualizer */}
                <div className="py-8 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 overflow-x-auto">
                  {pathNodes.map((node, index) => {
                    if (!node) return null;
                    const ratio = node.currentDensity / node.capacity;
                    let dotColor = 'bg-brand-green shadow-glow-green';
                    if (ratio >= 0.9) dotColor = 'bg-brand-red shadow-glow-red animate-ping';
                    else if (ratio >= 0.7) dotColor = 'bg-brand-orange shadow-glow-orange';

                    return (
                      <div key={node.id} className="flex items-center space-x-4 shrink-0">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.15 }}
                          className="flex flex-col p-3 rounded-xl bg-slate-950/60 border border-slate-850 min-w-[120px] text-xs relative"
                        >
                          <span className="absolute top-2 right-2 w-2 h-2 rounded-full border border-slate-900 shadow-sm inline-block">
                            <span className={`absolute w-full h-full rounded-full inline-block ${dotColor}`} />
                          </span>
                          <span className="font-bold text-slate-200 truncate pr-3">{node.id}</span>
                          <span className="text-[10px] text-slate-500 truncate mt-0.5">{node.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 mt-2">
                            {Math.round((node.currentDensity / node.capacity) * 100)}% load
                          </span>
                        </motion.div>

                        {index < pathNodes.length - 1 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: 24 }}
                            transition={{ delay: index * 0.15 }}
                            className="text-slate-600 hidden md:block shrink-0"
                          >
                            <ArrowRight className="w-5 h-5 text-brand-blue animate-pulse" />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800/50 pt-4 text-[10px] font-mono text-slate-500">
                  ⚡ Note: You can view this computed path highlighted dynamically on the Live Map.
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel border-slate-800/60 rounded-2xl p-6 min-h-[295px] flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-3">
                <Play className="w-8 h-8 text-brand-blue animate-pulse" />
                <p className="max-w-[300px] text-center leading-relaxed">No path calculated. Configure a Source and Destination exit on the panel and calculate routes.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
