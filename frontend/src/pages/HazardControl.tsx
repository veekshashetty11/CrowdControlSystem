import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { findSafestPathAStar } from '../utils/algorithms';
import type { HazardType, VenueNode, VenueEdge } from '../types';
import {
  Flame, Wind, OctagonAlert, HeartPulse, Zap,
  Droplets, Building2, ShieldAlert, Trash2, X, TriangleAlert,
  SlidersHorizontal, Users, Gauge, Activity,
  DoorOpen, ArrowRight, FlaskConical,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
//  HAZARD CONTROL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
const HAZARD_DEFS: {
  type: HazardType;
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  bg: string;
  description: string;
}[] = [
  {
    type: 'FIRE', label: 'Fire', emoji: '🔥',
    icon: Flame, color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10',
    description: 'Node density maxed. Edge weights ×8. Immediate reroute.',
  },
  {
    type: 'SMOKE', label: 'Smoke', emoji: '💨',
    icon: Wind, color: 'text-slate-300', border: 'border-slate-400/40', bg: 'bg-slate-400/10',
    description: 'Adjacent corridor capacity halved. Visibility reduced.',
  },
  {
    type: 'BLOCKED_CORRIDOR', label: 'Blocked Corridor', emoji: '🚧',
    icon: OctagonAlert, color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10',
    description: 'All connected edges set to max weight (route-blocked).',
  },
  {
    type: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', emoji: '🏥',
    icon: HeartPulse, color: 'text-pink-400', border: 'border-pink-500/40', bg: 'bg-pink-500/10',
    description: 'Edge weights +200. Medical crews need clear path.',
  },
  {
    type: 'POWER_FAILURE', label: 'Power Failure', emoji: '⚡',
    icon: Zap, color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10',
    description: 'All outgoing edges capacity set to 0. Zone isolated.',
  },
  {
    type: 'FLOOD', label: 'Flood', emoji: '🌊',
    icon: Droplets, color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-500/10',
    description: 'Node density 90%. Edge weights ×5 due to water hazard.',
  },
  {
    type: 'STRUCTURAL_COLLAPSE', label: 'Structural Collapse', emoji: '💀',
    icon: Building2, color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10',
    description: 'All connected edges route-blocked. Zone condemned.',
  },
];

const SEV_COLOR = ['', 'bg-brand-green', 'bg-brand-green', 'bg-amber-400', 'bg-brand-orange', 'bg-brand-red'];

// ═══════════════════════════════════════════════════════════════════════════════
//  WHAT-IF SIMULATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
interface WhatIfParams {
  crowdSize: number;
  walkingSpeed: number;
  hazardSeverity: number;
  panicLevel: number;
  venueCapacity: number;
  exitAvailability: number;
}

const DEFAULT_PARAMS: WhatIfParams = {
  crowdSize: 2000,
  walkingSpeed: 1,
  hazardSeverity: 1,
  panicLevel: 20,
  venueCapacity: 100,
  exitAvailability: 100,
};

const WhatIfSlider: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number; max: number; step: number;
  format: (v: number) => string;
  color: string;
  accentClass: string;
  onChange: (v: number) => void;
}> = ({ label, icon, value, min, max, step, format, color, accentClass, onChange }) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2 text-slate-400">
        <span className={color}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`font-bold ${color}`}>{format(value)}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${accentClass}`}
    />
    <div className="flex justify-between text-[9px] font-mono text-slate-600">
      <span>{format(min)}</span><span>{format(max)}</span>
    </div>
  </div>
);

function computeRisk(localNodes: VenueNode[], localEdges: VenueEdge[]) {
  const nonExit = localNodes.filter(n => n.type !== 'EMERGENCY_EXIT');
  const avgDensity = nonExit.reduce((s, n) => s + n.currentDensity / n.capacity, 0) / Math.max(1, nonExit.length);
  const maxFlowUtil = localEdges.reduce((m, e) => Math.max(m, e.capacity > 0 ? e.currentFlow / e.capacity : 0), 0);
  const bottlenecks = localEdges.filter(e => e.capacity > 0 && e.currentFlow / e.capacity >= 0.9).length;
  const congested = localNodes.filter(n => n.currentDensity / n.capacity >= 0.7).length;
  const riskScore = Math.min(100, Math.round(avgDensity * 45 + maxFlowUtil * 35 + Math.min(bottlenecks * 10, 20)));
  const peakLoad = Math.max(...localNodes.map(n => n.currentDensity / n.capacity));
  const stampede = Math.min(100, Math.round(riskScore * 0.6 + peakLoad * 40));
  const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 35 ? 'MODERATE' : 'SAFE';
  return { riskScore, stampede, avgDensity, congested, riskLevel };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
type SubTab = 'hazards' | 'whatif';

export const HazardControl: React.FC = () => {
  const {
    nodes, edges: baseEdges,
    activeHazards, injectHazard, clearHazard, clearAllHazards,
  } = useSimulation();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('hazards');

  // ── Hazard state ──────────────────────────────────────────────────────────
  const [selectedHazard, setSelectedHazard] = useState<HazardType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [severity, setSeverity] = useState(3);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const selectedDef = HAZARD_DEFS.find(d => d.type === selectedHazard);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const affectedNodeIds = useMemo(() => new Set(activeHazards.map(h => h.nodeId)), [activeHazards]);

  const handleInject = () => {
    if (!selectedHazard || !selectedNodeId) return;
    injectHazard(selectedNodeId, selectedHazard, severity);
  };

  const handleClearAll = () => {
    if (!confirmClearAll) { setConfirmClearAll(true); return; }
    clearAllHazards();
    setConfirmClearAll(false);
  };

  // ── What-if state ─────────────────────────────────────────────────────────
  const [params, setParams] = useState<WhatIfParams>(DEFAULT_PARAMS);
  const set = (k: keyof WhatIfParams) => (v: number) => setParams(p => ({ ...p, [k]: v }));

  const { localNodes, risk, bestRoute } = useMemo(() => {
    const capScale    = params.venueCapacity / 100;
    const panicMult   = 1 + (params.panicLevel / 100) * 1.5;
    const speedMult   = params.walkingSpeed;
    const hazardPenalty = (params.hazardSeverity - 1) * 200;
    const exitScale   = params.exitAvailability / 100;

    const baseTotalCrowd = nodes.reduce((s, n) => s + n.currentDensity, 0) || 1;
    const densityScale = params.crowdSize / baseTotalCrowd;

    const localNodes: VenueNode[] = nodes.map(n => {
      const newCap = Math.round(n.capacity * capScale);
      let newDensity = Math.min(newCap, n.currentDensity * densityScale * panicMult);
      if (n.type === 'EMERGENCY_EXIT') newDensity *= exitScale;
      return { ...n, capacity: newCap, currentDensity: parseFloat(newDensity.toFixed(1)) };
    });

    const localEdges: VenueEdge[] = baseEdges.map(e => {
      const dest = localNodes.find(n => n.id === e.target);
      if (!dest) return e;
      const ratio = dest.currentDensity / dest.capacity;
      let penalty = ratio >= 0.9 ? 1000 : ratio >= 0.7 ? 300 : ratio >= 0.5 ? 50 : 0;
      penalty += hazardPenalty;
      const speedFactor = speedMult > 0 ? 1 / speedMult : 1;
      const newFlow = Math.round(e.capacity * 0.25 * ratio * speedFactor);
      return {
        ...e,
        weight: e.distance * speedFactor + penalty,
        currentFlow: Math.min(e.capacity, newFlow),
      };
    });

    const risk = computeRisk(localNodes, localEdges);

    const gates = localNodes.filter(n => n.type === 'ENTRY_GATE');
    const exits = localNodes.filter(n => n.type === 'EMERGENCY_EXIT');
    let bestRoute: string[] = [];
    let bestCost = Infinity;
    gates.forEach(g => exits.forEach(ex => {
      const res = findSafestPathAStar(localNodes, localEdges, g.id, ex.id);
      if (res.path.length > 0 && res.totalCost < bestCost) {
        bestCost = res.totalCost;
        bestRoute = res.path;
      }
    }));

    return { localNodes, localEdges, risk, bestRoute };
  }, [params, nodes, baseEdges]);

  const heatCells = useMemo(() =>
    [...localNodes].sort((a, b) => (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity)),
  [localNodes]);

  const riskColor = {
    SAFE: 'text-brand-green border-brand-green/30 bg-brand-green/10',
    MODERATE: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    HIGH: 'text-brand-orange border-brand-orange/30 bg-brand-orange/10',
    CRITICAL: 'text-brand-red border-brand-red/30 bg-brand-red/10 animate-pulse',
  }[risk.riskLevel] || '';

  const riskBarColor = {
    SAFE: 'bg-brand-green',
    MODERATE: 'bg-amber-400',
    HIGH: 'bg-brand-orange',
    CRITICAL: 'bg-brand-red',
  }[risk.riskLevel] || 'bg-brand-green';

  // ═════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-80px)] flex flex-col overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800/60 bg-slate-950/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-red/15 border border-brand-red/30">
            <ShieldAlert className="w-5 h-5 text-brand-red" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Hazard &amp; Scenario Control</h2>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Inject hazards · Run what-if scenarios · Graph updated instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab switcher */}
          <div className="flex items-center bg-slate-900/60 border border-slate-800/60 rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab('hazards')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                activeSubTab === 'hazards'
                  ? 'bg-brand-red/15 text-brand-red border border-brand-red/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <TriangleAlert className="w-3.5 h-3.5" />
              <span>Hazards</span>
            </button>
            <button
              onClick={() => setActiveSubTab('whatif')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                activeSubTab === 'whatif'
                  ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/25'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>What-If</span>
            </button>
          </div>

          {/* Hazard counters / actions */}
          {activeSubTab === 'hazards' && activeHazards.length > 0 && (
            <>
              <span className="text-xs font-mono font-bold text-brand-red bg-brand-red/10 border border-brand-red/25 px-2.5 py-1 rounded-full animate-pulse">
                {activeHazards.length} ACTIVE HAZARD{activeHazards.length > 1 ? 'S' : ''}
              </span>
              <button
                onClick={handleClearAll}
                onBlur={() => setConfirmClearAll(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                  confirmClearAll
                    ? 'bg-brand-red text-white border-brand-red animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmClearAll ? 'CONFIRM CLEAR ALL' : 'Clear All'}
              </button>
            </>
          )}

          {activeSubTab === 'whatif' && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <Activity className="w-3 h-3 text-brand-blue" />
              ISOLATED SANDBOX MODE
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}

      {/* ═══ HAZARDS TAB ═══ */}
      {activeSubTab === 'hazards' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Hazard Type Picker */}
          <div className="w-72 shrink-0 border-r border-slate-800/60 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-1 mb-3">Select Hazard Type</div>
            {HAZARD_DEFS.map(def => {
              const isSelected = selectedHazard === def.type;
              return (
                <button
                  key={def.type}
                  onClick={() => setSelectedHazard(def.type)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? `${def.bg} ${def.border} ${def.color} shadow-lg`
                      : 'border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{def.emoji}</span>
                    <div>
                      <div className={`text-xs font-bold font-mono ${isSelected ? def.color : ''}`}>{def.label}</div>
                      {isSelected && (
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{def.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Center — Configuration + Inject */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Configure &amp; Inject</div>

            {/* Node selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">Target Node</label>
              <select
                value={selectedNodeId}
                onChange={e => setSelectedNodeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-blue/60"
              >
                <option value="">— Select a venue node —</option>
                {nodes.map(n => {
                  const ratio = n.currentDensity / n.capacity;
                  const flag = affectedNodeIds.has(n.id) ? ' ⚠' : '';
                  const density = `${Math.round(ratio * 100)}%`;
                  return (
                    <option key={n.id} value={n.id}>
                      {n.name}{flag} [{density}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected node info */}
            {selectedNode && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                affectedNodeIds.has(selectedNode.id)
                  ? 'border-brand-red/30 bg-brand-red/5'
                  : 'border-slate-800/60 bg-slate-900/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 font-mono">{selectedNode.name}</span>
                  {affectedNodeIds.has(selectedNode.id) && (
                    <span className="text-[10px] text-brand-red font-mono border border-brand-red/30 px-1.5 py-0.5 rounded-md">HAS HAZARD</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-500">Type</div>
                    <div className="text-slate-200 font-bold">{selectedNode.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-500">Density</div>
                    <div className="text-slate-200 font-bold">{Math.round(selectedNode.currentDensity)}/{selectedNode.capacity}</div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-500">Load</div>
                    <div className={`font-bold ${selectedNode.currentDensity / selectedNode.capacity >= 0.9 ? 'text-brand-red' : selectedNode.currentDensity / selectedNode.capacity >= 0.7 ? 'text-brand-orange' : 'text-brand-green'}`}>
                      {Math.round((selectedNode.currentDensity / selectedNode.capacity) * 100)}%
                    </div>
                  </div>
                </div>
                {/* Density bar */}
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-brand-blue"
                    style={{ width: `${Math.min(100, (selectedNode.currentDensity / selectedNode.capacity) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Severity slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Hazard Severity</span>
                <span className={`font-bold ${SEV_COLOR[severity]} bg-clip-text`} style={{ WebkitBackgroundClip: 'text' }}>
                  {severity}/5 — {['', 'Minimal', 'Low', 'Moderate', 'High', 'Catastrophic'][severity]}
                </span>
              </div>
              <input
                type="range" min={1} max={5} step={1} value={severity}
                onChange={e => setSeverity(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-orange"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                {['1', '2', '3', '4', '5'].map(s => <span key={s}>{s}</span>)}
              </div>
            </div>

            {/* Hazard type selected summary */}
            {selectedDef && (
              <div className={`p-4 rounded-xl border ${selectedDef.bg} ${selectedDef.border}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-2xl">{selectedDef.emoji}</span>
                  <span className={`text-sm font-bold font-mono ${selectedDef.color}`}>{selectedDef.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{selectedDef.description}</p>
              </div>
            )}

            {/* Inject button */}
            <button
              onClick={handleInject}
              disabled={!selectedHazard || !selectedNodeId}
              className={`w-full py-3.5 rounded-xl text-sm font-bold font-mono border transition-all flex items-center justify-center gap-2 ${
                selectedHazard && selectedNodeId
                  ? 'bg-brand-red/15 border-brand-red/40 text-brand-red hover:bg-brand-red/25 shadow-glow-red'
                  : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <TriangleAlert className="w-4 h-4" />
              INJECT HAZARD
            </button>

            {(!selectedHazard || !selectedNodeId) && (
              <p className="text-[10px] font-mono text-slate-600 text-center">
                Select a hazard type and target node to enable injection.
              </p>
            )}
          </div>

          {/* Right — Active Hazards Log */}
          <div className="w-80 shrink-0 border-l border-slate-800/60 overflow-y-auto p-4 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Active Hazards</div>

            {activeHazards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 font-mono text-xs text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-slate-700" />
                <p>No active hazards.<br />The venue is operating normally.</p>
              </div>
            ) : (
              <AnimatePresence>
                {[...activeHazards].reverse().map(h => {
                  const def = HAZARD_DEFS.find(d => d.type === h.type)!;
                  const node = nodes.find(n => n.id === h.nodeId);
                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-3.5 rounded-xl border ${def.bg} ${def.border} space-y-2`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{def.emoji}</span>
                          <div>
                            <div className={`text-xs font-bold font-mono ${def.color}`}>{def.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {node?.name || h.nodeId}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => clearHazard(h.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-brand-red hover:bg-brand-red/10 transition-all"
                          title="Clear hazard"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                        <span>Severity {h.severity}/5</span>
                        <span>{h.injectedAt}</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${i < h.severity ? SEV_COLOR[h.severity] : 'bg-slate-800'}`}
                          />
                        ))}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {h.affectedEdgeIds.length} edge{h.affectedEdgeIds.length !== 1 ? 's' : ''} affected
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* ═══ WHAT-IF TAB ═══ */}
      {activeSubTab === 'whatif' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left — Sliders */}
          <div className="w-80 shrink-0 border-r border-slate-800/60 overflow-y-auto p-5 space-y-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Scenario Parameters</div>

            <WhatIfSlider label="Crowd Size" icon={<Users className="w-4 h-4" />}
              value={params.crowdSize} min={0} max={5000} step={50}
              format={v => `${v.toLocaleString()} ppl`} color="text-brand-blue" accentClass="accent-brand-blue"
              onChange={set('crowdSize')} />

            <WhatIfSlider label="Walking Speed" icon={<Activity className="w-4 h-4" />}
              value={params.walkingSpeed} min={0.5} max={3} step={0.1}
              format={v => `${v.toFixed(1)}×`} color="text-brand-green" accentClass="accent-brand-green"
              onChange={set('walkingSpeed')} />

            <WhatIfSlider label="Hazard Severity" icon={<TriangleAlert className="w-4 h-4" />}
              value={params.hazardSeverity} min={1} max={5} step={1}
              format={v => `${v}/5`} color="text-brand-orange" accentClass="accent-brand-orange"
              onChange={set('hazardSeverity')} />

            <WhatIfSlider label="Panic Level" icon={<Zap className="w-4 h-4" />}
              value={params.panicLevel} min={0} max={100} step={5}
              format={v => `${v}%`} color="text-brand-red" accentClass="accent-brand-red"
              onChange={set('panicLevel')} />

            <WhatIfSlider label="Venue Capacity" icon={<Gauge className="w-4 h-4" />}
              value={params.venueCapacity} min={50} max={150} step={5}
              format={v => `${v}%`} color="text-amber-400" accentClass="accent-yellow-400"
              onChange={set('venueCapacity')} />

            <WhatIfSlider label="Exit Availability" icon={<DoorOpen className="w-4 h-4" />}
              value={params.exitAvailability} min={0} max={100} step={5}
              format={v => `${v}%`} color="text-cyan-400" accentClass="accent-cyan-400"
              onChange={set('exitAvailability')} />

            <button
              onClick={() => setParams(DEFAULT_PARAMS)}
              className="w-full py-2 text-xs font-mono text-slate-500 border border-slate-800 rounded-xl hover:text-white hover:border-slate-600 transition-all"
            >
              ↺ Reset to Defaults
            </button>
          </div>

          {/* Right — Outputs */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Risk Scorecard */}
            <div className="grid grid-cols-4 gap-4">
              <div className={`col-span-2 p-4 rounded-2xl border space-y-3 ${riskColor}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">Scenario Risk Score</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${riskColor}`}>{risk.riskLevel}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-extrabold">{risk.riskScore}</span>
                  <span className="text-lg opacity-60 mb-1">/100</span>
                </div>
                <div className="w-full bg-slate-950/50 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${riskBarColor}`}
                    style={{ width: `${risk.riskScore}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono opacity-70 border-t border-current/20 pt-2">
                  <span>Stampede probability</span>
                  <span className="font-bold">{risk.stampede}%</span>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Avg Density</div>
                <div className="text-2xl font-bold text-slate-200">{(risk.avgDensity * 100).toFixed(1)}%</div>
                <div className="text-[10px] font-mono text-slate-500">across all zones</div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Congested</div>
                <div className={`text-2xl font-bold ${risk.congested > 0 ? 'text-brand-orange' : 'text-brand-green'}`}>
                  {risk.congested}
                </div>
                <div className="text-[10px] font-mono text-slate-500">zones at risk</div>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Zone Density Heatmap</div>
              <div className="grid grid-cols-5 gap-2">
                {heatCells.map(n => {
                  const ratio = Math.min(1, n.currentDensity / n.capacity);
                  const hue = Math.round((1 - ratio) * 120);
                  return (
                    <div
                      key={n.id}
                      className="rounded-xl p-2.5 border border-slate-800/40 text-center space-y-1 transition-all duration-500"
                      style={{ background: `hsla(${hue}, 70%, 30%, 0.25)`, borderColor: `hsla(${hue}, 70%, 50%, 0.3)` }}
                      title={`${n.name}: ${Math.round(ratio * 100)}%`}
                    >
                      <div className="text-[9px] font-mono font-bold" style={{ color: `hsl(${hue}, 70%, 65%)` }}>
                        {Math.round(ratio * 100)}%
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono leading-tight truncate">{n.id.replace(/_/g, ' ')}</div>
                      <div className="w-full bg-slate-900/60 rounded-full h-1">
                        <div className="h-1 rounded-full transition-all duration-500"
                          style={{ width: `${ratio * 100}%`, background: `hsl(${hue}, 70%, 55%)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optimal Route */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
                A* Optimal Egress Route (Sandbox)
              </div>
              {bestRoute.length > 0 ? (
                <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-4">
                  <div className="flex items-center flex-wrap gap-2">
                    {bestRoute.map((nodeId, i) => {
                      const n = localNodes.find(x => x.id === nodeId);
                      if (!n) return null;
                      const ratio = n.currentDensity / n.capacity;
                      const hue = Math.round((1 - Math.min(1, ratio)) * 120);
                      return (
                        <React.Fragment key={nodeId}>
                          <div
                            className="flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-[9px] font-mono font-bold"
                            style={{
                              borderColor: `hsl(${hue}, 60%, 50%, 0.5)`,
                              background: `hsl(${hue}, 60%, 30%, 0.2)`,
                              color: `hsl(${hue}, 70%, 65%)`,
                            }}
                          >
                            <span>{nodeId.replace(/_/g, ' ')}</span>
                            <span style={{ opacity: 0.7 }}>{Math.round(ratio * 100)}%</span>
                          </div>
                          {i < bestRoute.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-3">
                    {bestRoute.length} hops · Congestion-aware A* pathfinding on sandbox graph
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-2xl border border-brand-red/20 bg-brand-red/5 text-brand-red text-xs font-mono">
                  <TriangleAlert className="w-4 h-4 shrink-0" />
                  No viable egress path found with current scenario parameters.
                </div>
              )}
            </div>

            {/* Scenario summary */}
            <div className="grid grid-cols-3 gap-3 text-[10px] font-mono">
              {[
                { label: 'Total Crowd', value: params.crowdSize.toLocaleString(), icon: <Users className="w-3.5 h-3.5 text-brand-blue" /> },
                { label: 'Walking Speed', value: `${params.walkingSpeed.toFixed(1)}×`, icon: <Activity className="w-3.5 h-3.5 text-brand-green" /> },
                { label: 'Panic Level', value: `${params.panicLevel}%`, icon: <Zap className="w-3.5 h-3.5 text-brand-red" /> },
                { label: 'Hazard Severity', value: `${params.hazardSeverity}/5`, icon: <TriangleAlert className="w-3.5 h-3.5 text-brand-orange" /> },
                { label: 'Venue Capacity', value: `${params.venueCapacity}%`, icon: <Gauge className="w-3.5 h-3.5 text-amber-400" /> },
                { label: 'Exit Availability', value: `${params.exitAvailability}%`, icon: <DoorOpen className="w-3.5 h-3.5 text-cyan-400" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    {icon} {label}
                  </div>
                  <span className="text-slate-200 font-bold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
