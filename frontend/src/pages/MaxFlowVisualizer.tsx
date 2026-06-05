import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  GitFork, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Flame, 
  Activity, 
  Terminal, 
  Sliders
} from 'lucide-react';
import { computeMaxFlowDetailed } from '../utils/algorithms';
import type { MaxFlowStep } from '../types';

export const MaxFlowVisualizer: React.FC = () => {
  const { nodes, edges } = useSimulation();

  // Find entries (sources) and exits (sinks)
  const entries = nodes.filter(n => n.type === 'ENTRY_GATE').map(n => n.id);
  const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT').map(n => n.id);

  // States
  const [maxFlowSteps, setMaxFlowSteps] = useState<MaxFlowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Run detailed Ford-Fulkerson on mount or change
  useEffect(() => {
    const { steps } = computeMaxFlowDetailed(nodes, edges, entries, exits);
    setMaxFlowSteps(steps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [nodes, edges]);

  // Timer loop for playback
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && maxFlowSteps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= maxFlowSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, maxFlowSteps]);

  // Coordinate helper mapping
  const getXPercent = (x: number) => {
    const minX = 120;
    const maxX = 930;
    return ((x - minX) / (maxX - minX)) * 88 + 6;
  };

  const getYPercent = (y: number) => {
    const minY = 100;
    const maxY = 500;
    return ((y - minY) / (maxY - minY)) * 72 + 14;
  };

  const currentStep: MaxFlowStep | undefined = maxFlowSteps[currentStepIndex];

  // Helper to query flow value of an edge at the current step
  const getEdgeFlow = (src: string, dest: string) => {
    if (!currentStep) return 0;
    return currentStep.currentFlows[src]?.[dest] || 0;
  };

  // Helper to query residual capacity of an edge at the current step
  const getEdgeResidual = (src: string, dest: string, capacity: number) => {
    if (!currentStep) return capacity;
    return currentStep.residualCapacities[src]?.[dest] ?? 0;
  };

  // Check if edge is in the current step's augmenting path
  const isEdgeInAugmentingPath = (src: string, dest: string) => {
    if (!currentStep || !currentStep.augmentingPath) return false;
    const path = currentStep.augmentingPath;
    const srcIndex = path.indexOf(src);
    return srcIndex !== -1 && path[srcIndex + 1] === dest;
  };

  // Critical bottleneck corridors at the current step
  const getBottleneckEdges = () => {
    const critical: string[] = [];
    edges.forEach(e => {
      const flow = getEdgeFlow(e.source, e.target);
      if (flow > 0 && flow >= e.capacity) {
        critical.push(e.id);
      }
    });
    return critical;
  };

  const criticalEdges = getBottleneckEdges();
  const maxFlowVal = currentStep ? currentStep.totalFlowSoFar : 0;
  const isCompleted = currentStep && currentStep.augmentingPath === null;

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
            Ford-Fulkerson Max Flow Visualizer
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Simulates augmenting path flows and highlights bottleneck corridors using Edmonds-Karp.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-850 p-1.5 rounded-xl">
          <button
            onClick={() => { setCurrentStepIndex(0); setIsPlaying(false); }}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-350 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-all"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 border rounded-lg flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-brand-blue/15 border-brand-blue/40 text-brand-blue shadow-glow-blue' 
                : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(prev => Math.min(maxFlowSteps.length - 1, prev + 1));
            }}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-350 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-all"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="px-3 text-[10px] font-mono text-slate-450">
            Step {currentStepIndex + 1} / {maxFlowSteps.length || 1}
          </div>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Max Flow value */}
        <GlassCard glowColor="blue" className="p-5 flex items-center space-x-4">
          <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl text-brand-blue">
            <GitFork className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Maximum Flow Egress</span>
            <span className="text-2xl font-bold text-slate-100">{maxFlowVal.toFixed(1)} people/s</span>
          </div>
        </GlassCard>

        {/* Critical bottleneck corridors count */}
        <GlassCard glowColor={criticalEdges.length > 0 ? 'red' : 'none'} className="p-5 flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${criticalEdges.length > 0 ? 'bg-brand-red/10 border-brand-red/20 text-brand-red animate-pulse' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Bottleneck Corridors</span>
            <span className={`text-2xl font-bold ${criticalEdges.length > 0 ? 'text-brand-red' : 'text-slate-100'}`}>
              {criticalEdges.length} active
            </span>
          </div>
        </GlassCard>

        {/* Status indicator */}
        <GlassCard glowColor={isCompleted ? 'green' : 'none'} className="p-5 flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${isCompleted ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' : 'bg-slate-900 border border-slate-800 text-slate-500 animate-pulse'}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Solver Status</span>
            <span className={`text-2xl font-bold ${isCompleted ? 'text-brand-green' : 'text-brand-blue'}`}>
              {isCompleted ? 'Optimized' : 'Solving...'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Network Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
            Augmenting Path & Capacity Network
          </h3>
          
          <div className="glass-panel border-slate-850 rounded-2xl p-6 bg-slate-950/40 relative h-[400px]">
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
                </marker>
                <marker
                  id="arrow-bottleneck"
                  viewBox="0 0 10 10"
                  refX="16"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
                </marker>
              </defs>

              {edges.map(edge => {
                const srcNode = nodes.find(n => n.id === edge.source);
                const destNode = nodes.find(n => n.id === edge.target);
                if (!srcNode || !destNode) return null;

                const flow = getEdgeFlow(edge.source, edge.target);
                const isBottleneck = flow > 0 && flow >= edge.capacity;
                const isActive = isEdgeInAugmentingPath(edge.source, edge.target);

                let lineColor = '#1e293b';
                let markerId = 'arrow-default';
                if (isBottleneck) {
                  lineColor = '#EF4444';
                  markerId = 'arrow-bottleneck';
                } else if (isActive) {
                  lineColor = '#10B981';
                  markerId = 'arrow-active';
                }

                return (
                  <g key={edge.id}>
                    <line
                      x1={`${getXPercent(srcNode.x)}%`}
                      y1={`${getYPercent(srcNode.y)}%`}
                      x2={`${getXPercent(destNode.x)}%`}
                      y2={`${getYPercent(destNode.y)}%`}
                      stroke={lineColor}
                      strokeWidth={isActive ? 3.5 : (isBottleneck ? 2.5 : 1.5)}
                      markerEnd={`url(#${markerId})`}
                      strokeDasharray={flow > 0 ? "5, 5" : "none"}
                      className={flow > 0 ? 'animate-[dash_2s_linear_infinite]' : ''}
                      style={{
                        // Simple inline style to animate flow movement dynamically
                        strokeDashoffset: flow > 0 ? 0 : undefined
                      }}
                    />
                    {/* Flow overlay text */}
                    <text
                      x={`${(getXPercent(srcNode.x) + getXPercent(destNode.x)) / 2}%`}
                      y={`${(getYPercent(srcNode.y) + getYPercent(destNode.y)) / 2 - 2}%`}
                      fill={isBottleneck ? '#EF4444' : (isActive ? '#10B981' : '#94a3b8')}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="font-bold bg-slate-950 px-1"
                    >
                      {flow}/{edge.capacity}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const isSource = entries.includes(node.id);
              const isSink = exits.includes(node.id);

              let borderClass = 'border-slate-800 bg-slate-950 text-slate-400';
              if (isSource) borderClass = 'border-brand-blue bg-brand-blue/10 text-brand-blue';
              if (isSink) borderClass = 'border-brand-green bg-brand-green/10 text-brand-green';

              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: `${getXPercent(node.x)}%`,
                    top: `${getYPercent(node.y)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[9px] font-mono font-bold flex flex-col items-center justify-center min-w-[70px] ${borderClass}`}
                >
                  <span className="truncate max-w-[66px]">{node.id}</span>
                </div>
              );
            })}
          </div>

          {/* Diagnostic Console trace log */}
          <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs flex items-start space-x-2">
            <Terminal className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div>
              <span className="text-brand-blue font-bold">Trace Log: </span>
              <span className="text-slate-350">
                {currentStep ? currentStep.description : 'Awaiting initialization...'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Panel (Corridors table & augment history) */}
        <div className="space-y-6">
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Sliders className="w-4 h-4 mr-1.5 text-brand-blue" />
              <span>Corridor Flow Allocations</span>
            </h3>

            <div className="overflow-y-auto max-h-[385px] space-y-2.5 font-mono text-[10px]">
              {edges.map(edge => {
                const flow = getEdgeFlow(edge.source, edge.target);
                const residual = getEdgeResidual(edge.source, edge.target, edge.capacity);
                const utilization = edge.capacity > 0 ? (flow / edge.capacity) * 100 : 0;
                const isBottleneck = utilization >= 99;

                return (
                  <div 
                    key={edge.id} 
                    className={`p-3 border rounded-xl flex flex-col space-y-1.5 transition-colors ${
                      isBottleneck 
                        ? 'bg-brand-red/5 border-brand-red/20 text-brand-red' 
                        : 'bg-slate-900/40 border-slate-850 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>{edge.id}</span>
                      <span className={isBottleneck ? 'text-brand-red' : 'text-brand-blue'}>
                        {utilization.toFixed(0)}% Utilized
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
                      <div>Flow: <span className="font-bold text-slate-300">{flow} p/s</span></div>
                      <div>Residual: <span className="font-bold text-slate-350">{residual} p/s</span></div>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${isBottleneck ? 'bg-brand-red' : 'bg-brand-blue'}`}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
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
