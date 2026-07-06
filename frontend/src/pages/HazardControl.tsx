import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import type { HazardType } from '../types';
import {
  Flame, Wind, OctagonAlert, HeartPulse, Zap,
  Droplets, Building2, ShieldAlert, Trash2, X, TriangleAlert,
} from 'lucide-react';

// ─── Hazard Definitions ────────────────────────────────────────────────────
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

export const HazardControl: React.FC = () => {
  const { nodes, activeHazards, injectHazard, clearHazard, clearAllHazards } = useSimulation();

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
            <h2 className="text-xl font-extrabold text-white tracking-tight">Emergency Hazard Control</h2>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Inject real-time hazards · Graph updated instantly · Rerouting triggered automatically
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeHazards.length > 0 && (
            <span className="text-xs font-mono font-bold text-brand-red bg-brand-red/10 border border-brand-red/25 px-2.5 py-1 rounded-full animate-pulse">
              {activeHazards.length} ACTIVE HAZARD{activeHazards.length > 1 ? 'S' : ''}
            </span>
          )}
          {activeHazards.length > 0 && (
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
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
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
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Configure & Inject</div>

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
    </motion.div>
  );
};
