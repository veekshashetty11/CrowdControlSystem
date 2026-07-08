import React, { useEffect, useRef, useState } from 'react';
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
  Info,
  MapPin,
  Layers,
  Sparkles,
  GitFork,
  CheckCircle2,
  Settings,
  Gauge
} from 'lucide-react';

type SubTab = 'controls' | 'settings';

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
    clearLogs,
    nodes,
    edges,
    injectCrowd,
  } = useSimulation();

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('controls');

  // Settings-specific state
  const [selectedNode, setSelectedNode] = useState('Gate_A');
  const [injectAmt, setInjectAmt] = useState(100);
  const [successMsg, setSuccessMsg] = useState('');

  const handleInject = () => {
    injectCrowd(selectedNode, injectAmt);
    const nodeObj = nodes.find(n => n.id === selectedNode);
    setSuccessMsg(`Successfully injected ${injectAmt} people at ${nodeObj?.name || selectedNode}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const applyScenario = (type: 'concert' | 'squeeze' | 'normal') => {
    resetSimulation();
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
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Simulation &amp; Settings
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Control execution parameters, inject crowd loads, apply presets, and trace diagnostics.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800/60 rounded-xl p-1">
          <button
            onClick={() => setActiveSubTab('controls')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeSubTab === 'controls'
                ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/25'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Controls</span>
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeSubTab === 'settings'
                ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/25'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Venue &amp; Presets</span>
          </button>
        </div>
      </div>

      {/* ─── Controls Sub-tab ─────────────────────────────────── */}
      {activeSubTab === 'controls' && (
        <motion.div
          key="controls"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
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
        </motion.div>
      )}

      {/* ─── Settings Sub-tab ─────────────────────────────────── */}
      {activeSubTab === 'settings' && (
        <motion.div
          key="settings"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Manual Influx Control + Presets */}
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

                {/* Status Message */}
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
        </motion.div>
      )}
    </motion.div>
  );
};
