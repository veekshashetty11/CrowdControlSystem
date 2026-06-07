import React, { useState, useEffect } from 'react';
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
  Pause, 
  SkipForward, 
  RotateCcw,
  Cpu,
  Layers,
  BookOpen
} from 'lucide-react';
import { findSafestPathAStarDetailed } from '../utils/algorithms';
import type { AStarStep } from '../types';

export const RouteOptimizer: React.FC = () => {
  const { nodes, edges, calculateRoute, selectedPath, activeAlgorithm } = useSimulation();

  const [source, setSource] = useState('Gate_A');
  const [destination, setDestination] = useState('Exit_A');
  const [isAnimating, setIsAnimating] = useState(false);

  // DAA Learning Mode state
  const [isDAAMode, setIsDAAMode] = useState(false);
  const [astarSteps, setAstarSteps] = useState<AStarStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Filter nodes for dropdowns
  const nodeOptions = nodes.filter(n => n.type !== 'EMERGENCY_EXIT');
  const exitOptions = nodes.filter(n => n.type === 'EMERGENCY_EXIT');

  // Trigger path calculation
  const handleCalculate = () => {
    if (isDAAMode) {
      // Step-by-step mode
      const { steps } = findSafestPathAStarDetailed(nodes, edges, source, destination);
      setAstarSteps(steps);
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      // Direct instant mode
      setIsAnimating(true);
      calculateRoute(source, destination);
      setTimeout(() => {
        setIsAnimating(false);
      }, 1200);
    }
  };

  // Playback timer effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && isDAAMode && astarSteps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= astarSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isDAAMode, astarSteps]);

  // Coordinate helper mapping
  const getXPercent = (x: number) => {
    const minX = 100;
    const maxX = 2600;
    return ((x - minX) / (maxX - minX)) * 88 + 6;
  };

  const getYPercent = (y: number) => {
    const minY = 100;
    const maxY = 1150;
    return ((y - minY) / (maxY - minY)) * 72 + 14;
  };

  const currentStep: AStarStep | undefined = astarSteps[currentStepIndex];

  // Helper to determine node highlight color in step-by-step mode
  const getNodeState = (nodeId: string) => {
    if (!currentStep) return 'DEFAULT';
    
    // Check if node is the current pulsing node
    if (currentStep.currentNode === nodeId) return 'CURRENT';

    // Check if node is in the final path resolved so far (or at end)
    if (currentStep.currentPath.includes(nodeId)) return 'PATH';

    // Check if node is in the closed set (visited)
    if (currentStep.closedSet.includes(nodeId)) return 'VISITED';

    // Check if node is in open set
    if (currentStep.openSet.some(o => o.nodeId === nodeId)) return 'OPEN';

    return 'DEFAULT';
  };

  const nodeColors = {
    CURRENT: 'border-brand-blue bg-brand-blue/20 text-white shadow-glow-blue animate-pulse',
    PATH: 'border-brand-green bg-brand-green/20 text-brand-green shadow-glow-green',
    VISITED: 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.25)]',
    OPEN: 'border-slate-400 bg-slate-800 text-slate-350',
    DEFAULT: 'border-slate-800 bg-slate-950/80 text-slate-500'
  };

  const pathNodes = isDAAMode 
    ? (currentStep ? currentStep.currentPath.map(id => nodes.find(n => n.id === id)).filter(Boolean) : [])
    : selectedPath.map(id => nodes.find(n => n.id === id)).filter(Boolean);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Congestion-Aware Route Optimizer
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Applies A* Search with dynamic edge penalty weighting to locate safest exit vectors.
          </p>
        </div>

        {/* DAA Mode Toggle */}
        <button
          onClick={() => {
            setIsDAAMode(!isDAAMode);
            setAstarSteps([]);
            setIsPlaying(false);
          }}
          className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl border font-mono text-xs font-bold transition-all ${
            isDAAMode 
              ? 'bg-brand-blue/15 text-brand-blue border-brand-blue/40 shadow-glow-blue' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4.5 h-4.5" />
          <span>{isDAAMode ? 'DAA learning mode: ON' : 'Activate DAA Learning Mode'}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Control Panel */}
        <div className="space-y-6 lg:col-span-1">
          <GlassCard glowColor="none" className="space-y-6">
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
                <span>{isDAAMode ? 'Start Pathfinding' : (isAnimating ? 'Computing Path...' : 'Calculate Safest Route')}</span>
              </button>
            </div>
          </GlassCard>

          {/* DAA Learning controls */}
          {isDAAMode && astarSteps.length > 0 && (
            <GlassCard glowColor="none" className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-brand-orange" />
                <span>DAA Playback Controls</span>
              </h3>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
                  className="p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800/80 flex items-center justify-center transition-all"
                  title="Reset"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-3 border rounded-xl flex items-center justify-center transition-all ${
                    isPlaying 
                      ? 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange shadow-glow-orange' 
                      : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-850'
                  }`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(prev => Math.min(astarSteps.length - 1, prev + 1));
                  }}
                  className="p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800/80 flex items-center justify-center transition-all"
                  title="Next Step"
                >
                  <SkipForward className="w-4.5 h-4.5" />
                </button>

                <div className="flex items-center justify-center text-[10px] font-mono text-slate-400 border border-slate-850 bg-slate-950/40 rounded-xl">
                  Step {currentStepIndex + 1}/{astarSteps.length}
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Output Area */}
        <div className="lg:col-span-2 space-y-6">
          {isDAAMode && astarSteps.length > 0 ? (
            /* DAA Learning Mode layout */
            <div className="space-y-6">
              
              {/* Pathfinding Minimap visualizer */}
              <div className="glass-panel border-slate-850 rounded-2xl p-6 bg-slate-950/20 relative min-h-[320px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-4">
                  A* Traversal Graph State
                </h4>
                
                {/* SVG connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {edges.map(edge => {
                    const srcNode = nodes.find(n => n.id === edge.source);
                    const destNode = nodes.find(n => n.id === edge.target);
                    if (!srcNode || !destNode) return null;

                    // Check if edge is active in path
                    const pathIndex = currentStep ? currentStep.currentPath.indexOf(edge.source) : -1;
                    const isActive = currentStep && pathIndex !== -1 && currentStep.currentPath[pathIndex + 1] === edge.target;

                    const hasReverse = edges.some(e => e.source === edge.target && e.target === edge.source);
                    let sY = srcNode.y;
                    let tY = destNode.y;
                    if (hasReverse) {
                      const isSourceFirst = edge.source < edge.target;
                      const offset = isSourceFirst ? -12 : 12;
                      sY += offset;
                      tY += offset;
                    }

                    return (
                      <line
                        key={edge.id}
                        x1={`${getXPercent(srcNode.x)}%`}
                        y1={`${getYPercent(sY)}%`}
                        x2={`${getXPercent(destNode.x)}%`}
                        y2={`${getYPercent(tY)}%`}
                        stroke={isActive ? '#10B981' : '#1e293b'}
                        strokeWidth={isActive ? 3 : 1.5}
                        className={isActive ? 'shadow-glow-green filter drop-shadow-[0_0_4px_#10B981]' : ''}
                      />
                    );
                  })}
                </svg>

                {/* Nodes positioning */}
                {nodes.map(node => {
                  const state = getNodeState(node.id);
                  const colorClass = nodeColors[state];

                  return (
                    <div
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: `${getXPercent(node.x)}%`,
                        top: `${getYPercent(node.y)}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold flex flex-col items-center justify-center min-w-[76px] transition-all duration-300 ${colorClass}`}
                    >
                      <span>{node.id}</span>
                      <span className="text-[8px] text-slate-400 font-normal mt-0.5">
                        {Math.round((node.currentDensity / node.capacity) * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Step diagnostic trace log */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs flex items-start space-x-2">
                <Cpu className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                <div>
                  <span className="text-brand-blue font-bold">Step {currentStepIndex + 1}: </span>
                  <span className="text-slate-350">{currentStep?.description}</span>
                </div>
              </div>

              {/* Open & Closed Sets Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Open Set Table */}
                <GlassCard glowColor="none" className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Open Set (Priority Queue)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono text-left">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-500">
                          <th className="pb-2">Node</th>
                          <th className="pb-2 text-right">g(n) Cost</th>
                          <th className="pb-2 text-right">h(n) Heuristic</th>
                          <th className="pb-2 text-right text-brand-blue">f(n) Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStep && currentStep.openSet.length > 0 ? (
                          currentStep.openSet.map(item => (
                            <tr key={item.nodeId} className="border-b border-slate-900/60 text-slate-300">
                              <td className="py-2.5 font-bold">{item.nodeId}</td>
                              <td className="py-2.5 text-right">{item.g}</td>
                              <td className="py-2.5 text-right text-slate-500">{item.h}</td>
                              <td className="py-2.5 text-right text-brand-blue font-bold">{item.f}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-500">Empty set</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>

                {/* Closed Set & Cost Matrix */}
                <GlassCard glowColor="none" className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                      Closed Set (Visited)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentStep && currentStep.closedSet.length > 0 ? (
                        currentStep.closedSet.map(id => (
                          <span key={id} className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-yellow-500 font-bold">
                            {id}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">No nodes visited yet</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                      Current Node Cost Formula
                    </h4>
                    <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl font-mono text-[10px] text-slate-400 space-y-2">
                      {currentStep && currentStep.currentNode ? (
                        <>
                          <div className="flex justify-between">
                            <span>g({currentStep.currentNode}) Current Cost:</span>
                            <span className="text-slate-200 font-bold">{currentStep.gScores[currentStep.currentNode] || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>h({currentStep.currentNode}) Heuristic Cost:</span>
                            <span className="text-slate-200 font-bold">{currentStep.hScores[currentStep.currentNode] || 0}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-900 pt-1 text-brand-blue">
                            <span className="font-bold">f(n) Total Cost:</span>
                            <span className="font-extrabold">{currentStep.fScores[currentStep.currentNode] || 0}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic">No node currently selected</div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </div>

            </div>
          ) : (
            /* Instantaneous Mode Layout */
            <AnimatePresence mode="wait">
              {selectedPath.length > 0 && activeAlgorithm ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-panel border-slate-800/60 rounded-2xl p-6 min-h-[320px] flex flex-col justify-between"
                >
                  {/* Top overview stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-800/60 font-mono text-xs">
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1">
                      <span className="text-slate-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> Est. Time</span>
                      <span className="text-base font-bold text-slate-200">
                        {Math.round(pathNodes.length * 15)} seconds
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
                <div className="glass-panel border-slate-800/60 rounded-2xl p-6 min-h-[320px] flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-3">
                  <Play className="w-8 h-8 text-brand-blue animate-pulse" />
                  <p className="max-w-[300px] text-center leading-relaxed">No path calculated. Configure a Source and Destination exit on the panel and calculate routes.</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
};
