import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Terminal, 
  SlidersHorizontal,
  Flame,
  AlertTriangle,
  Info
} from 'lucide-react';

export const SimulationControl: React.FC = () => {
  const {
    isRunning,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    simulationSpeed,
    setSimulationSpeed,
    crowdSizeMultiplier,
    setCrowdSizeMultiplier,
    densityThreshold,
    setDensityThreshold,
    logs,
    clearLogs
  } = useSimulation();

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-8 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Simulation Controller
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Adjust generation rates, speed limits, and trace diagnostic telemetry logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playback Controls & Sliders */}
        <div className="space-y-6 lg:col-span-1">
          {/* Controls */}
          <GlassCard glowColor="none" className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Sliders className="w-4 h-4 mr-1.5 text-brand-blue" />
              <span>Execution State</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={startSimulation}
                disabled={isRunning}
                className={`py-3 rounded-xl text-xs font-bold font-mono transition-all flex flex-col items-center justify-center space-y-1.5 border border-brand-green/20 ${
                  isRunning 
                    ? 'bg-brand-green/5 text-brand-green/45' 
                    : 'bg-brand-green/10 text-brand-green hover:bg-brand-green/20 shadow-glow-green'
                }`}
              >
                <Play className="w-4.5 h-4.5" />
                <span>Start</span>
              </button>

              <button
                onClick={pauseSimulation}
                disabled={!isRunning}
                className={`py-3 rounded-xl text-xs font-bold font-mono transition-all flex flex-col items-center justify-center space-y-1.5 border border-brand-blue/20 ${
                  !isRunning 
                    ? 'bg-brand-blue/5 text-brand-blue/45' 
                    : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 shadow-glow-blue'
                }`}
              >
                <Pause className="w-4.5 h-4.5" />
                <span>Pause</span>
              </button>

              <button
                onClick={resetSimulation}
                className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl text-xs font-bold font-mono text-slate-400 hover:text-white transition-all flex flex-col items-center justify-center space-y-1.5"
              >
                <RotateCcw className="w-4.5 h-4.5" />
                <span>Reset</span>
              </button>
            </div>
          </GlassCard>

          {/* Sliders */}
          <GlassCard glowColor="none" className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <SlidersHorizontal className="w-4 h-4 mr-1.5 text-brand-orange" />
              <span>Control Parameters</span>
            </h3>

            <div className="space-y-5">
              {/* Simulation Speed */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Simulation Speed</span>
                  <span className="font-bold text-brand-blue">{simulationSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={simulationSpeed}
                  onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>

              {/* Crowd Size Multiplier */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Crowd Injection Rate</span>
                  <span className="font-bold text-brand-orange">{crowdSizeMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={crowdSizeMultiplier}
                  onChange={(e) => setCrowdSizeMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
              </div>

              {/* Density Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Congestion Warning Limit</span>
                  <span className="font-bold text-brand-red">{densityThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={densityThreshold}
                  onChange={(e) => setDensityThreshold(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-brand-red"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Live Diagnostics Console Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450 font-mono flex items-center">
              <Terminal className="w-4 h-4 mr-1.5 text-slate-500" />
              <span>Active Telemetry Terminal</span>
            </h3>
            <button
              onClick={clearLogs}
              className="text-[10px] uppercase font-mono text-slate-650 hover:text-slate-400 transition-colors bg-slate-900 border border-slate-850 px-2 py-0.5 rounded"
            >
              Clear Buffer
            </button>
          </div>

          <div className="glass-panel border-slate-800/80 rounded-2xl p-6 bg-slate-950/80 shadow-2xl h-[338px] flex flex-col font-mono text-xs overflow-hidden">
            {/* Scrollable logs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[11px] leading-relaxed">
              {logs.map((log) => {
                let lvlColor = 'text-brand-blue';
                let Icon = Info;
                if (log.level === 'WARNING') {
                  lvlColor = 'text-brand-orange';
                  Icon = AlertTriangle;
                } else if (log.level === 'CRITICAL') {
                  lvlColor = 'text-brand-red';
                  Icon = Flame;
                }

                return (
                  <div key={log.id} className="flex items-start space-x-2.5">
                    <span className="text-[10px] text-slate-600 select-none">[{log.timestamp}]</span>
                    <span className={`font-bold uppercase tracking-wide flex items-center shrink-0 ${lvlColor}`}>
                      <Icon className="w-3.5 h-3.5 mr-1" />
                      {log.level}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Input prompt line simulation */}
            <div className="border-t border-slate-850/60 pt-4 flex items-center text-slate-600 font-mono text-[11px] select-none">
              <span className="text-brand-blue mr-2">root@evacugraph_system:~$</span>
              <span className="text-slate-400 animate-pulse">■</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
