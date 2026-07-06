import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { findSafestPathAStar } from '../utils/algorithms';
import type { VenueNode, VenueEdge } from '../types';
import {
  SlidersHorizontal, Users, Zap, Gauge, Activity,
  DoorOpen, ArrowRight, AlertTriangle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface WhatIfParams {
  crowdSize: number;       // 0–5000
  walkingSpeed: number;    // 0.5–3
  hazardSeverity: number;  // 1–5
  panicLevel: number;      // 0–100 %
  venueCapacity: number;   // 50–150 %
  exitAvailability: number;// 0–100 %
}

const DEFAULT_PARAMS: WhatIfParams = {
  crowdSize: 2000,
  walkingSpeed: 1,
  hazardSeverity: 1,
  panicLevel: 20,
  venueCapacity: 100,
  exitAvailability: 100,
};

// ─── Slider component ────────────────────────────────────────────────────────
const Slider: React.FC<{
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

// ─── Risk score helper (mirrors SimulationContext formula) ──────────────────
function computeRisk(localNodes: VenueNode[], localEdges: VenueEdge[]): {
  riskScore: number;
  stampede: number;
  avgDensity: number;
  congested: number;
  riskLevel: string;
} {
  const nonExit = localNodes.filter(n => n.type !== 'EMERGENCY_EXIT');
  const avgDensity = nonExit.reduce((s, n) => s + n.currentDensity / n.capacity, 0) / Math.max(1, nonExit.length);
  const maxFlowUtil = localEdges.reduce((m, e) => {
    return Math.max(m, e.capacity > 0 ? e.currentFlow / e.capacity : 0);
  }, 0);
  const bottlenecks = localEdges.filter(e => e.capacity > 0 && e.currentFlow / e.capacity >= 0.9).length;
  const congested = localNodes.filter(n => n.currentDensity / n.capacity >= 0.7).length;
  const riskScore = Math.min(100, Math.round(avgDensity * 45 + maxFlowUtil * 35 + Math.min(bottlenecks * 10, 20)));
  const peakLoad = Math.max(...localNodes.map(n => n.currentDensity / n.capacity));
  const stampede = Math.min(100, Math.round(riskScore * 0.6 + peakLoad * 40));
  const riskLevel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 35 ? 'MODERATE' : 'SAFE';
  return { riskScore, stampede, avgDensity, congested, riskLevel };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const WhatIfSimulation: React.FC = () => {
  const { nodes: baseNodes, edges: baseEdges } = useSimulation();
  const [params, setParams] = useState<WhatIfParams>(DEFAULT_PARAMS);
  const set = (k: keyof WhatIfParams) => (v: number) => setParams(p => ({ ...p, [k]: v }));

  // ── Compute local sandbox ────────────────────────────────────────────────
  const { localNodes, risk, bestRoute } = useMemo(() => {
    const capScale    = params.venueCapacity / 100;
    const panicMult   = 1 + (params.panicLevel / 100) * 1.5;
    const speedMult   = params.walkingSpeed;
    const hazardPenalty = (params.hazardSeverity - 1) * 200;
    const exitScale   = params.exitAvailability / 100;

    // Scale node densities proportionally to crowdSize
    const baseTotalCrowd = baseNodes.reduce((s, n) => s + n.currentDensity, 0) || 1;
    const densityScale = params.crowdSize / baseTotalCrowd;

    const localNodes: VenueNode[] = baseNodes.map(n => {
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

    // A* best route: pick the gate with lowest-risk path to any exit
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
  }, [params, baseNodes, baseEdges]);

  // ── Heatmap cells (all nodes, sorted by density ratio) ──────────────────
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-80px)] overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-800/60 bg-slate-950/50 shrink-0">
        <div className="p-2.5 rounded-xl bg-brand-blue/15 border border-brand-blue/30">
          <SlidersHorizontal className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">What-If Simulation</h2>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            Adjust sliders to model scenarios · Sandbox does not affect live simulation
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <Activity className="w-3 h-3 text-brand-blue" />
          ISOLATED SANDBOX MODE
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Sliders */}
        <div className="w-80 shrink-0 border-r border-slate-800/60 overflow-y-auto p-5 space-y-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Scenario Parameters</div>

          <Slider label="Crowd Size" icon={<Users className="w-4 h-4" />}
            value={params.crowdSize} min={0} max={5000} step={50}
            format={v => `${v.toLocaleString()} ppl`} color="text-brand-blue" accentClass="accent-brand-blue"
            onChange={set('crowdSize')} />

          <Slider label="Walking Speed" icon={<Activity className="w-4 h-4" />}
            value={params.walkingSpeed} min={0.5} max={3} step={0.1}
            format={v => `${v.toFixed(1)}×`} color="text-brand-green" accentClass="accent-brand-green"
            onChange={set('walkingSpeed')} />

          <Slider label="Hazard Severity" icon={<AlertTriangle className="w-4 h-4" />}
            value={params.hazardSeverity} min={1} max={5} step={1}
            format={v => `${v}/5`} color="text-brand-orange" accentClass="accent-brand-orange"
            onChange={set('hazardSeverity')} />

          <Slider label="Panic Level" icon={<Zap className="w-4 h-4" />}
            value={params.panicLevel} min={0} max={100} step={5}
            format={v => `${v}%`} color="text-brand-red" accentClass="accent-brand-red"
            onChange={set('panicLevel')} />

          <Slider label="Venue Capacity" icon={<Gauge className="w-4 h-4" />}
            value={params.venueCapacity} min={50} max={150} step={5}
            format={v => `${v}%`} color="text-amber-400" accentClass="accent-yellow-400"
            onChange={set('venueCapacity')} />

          <Slider label="Exit Availability" icon={<DoorOpen className="w-4 h-4" />}
            value={params.exitAvailability} min={0} max={100} step={5}
            format={v => `${v}%`} color="text-cyan-400" accentClass="accent-cyan-400"
            onChange={set('exitAvailability')} />

          {/* Reset button */}
          <button
            onClick={() => setParams(DEFAULT_PARAMS)}
            className="w-full py-2 text-xs font-mono text-slate-500 border border-slate-800 rounded-xl hover:text-white hover:border-slate-600 transition-all"
          >
            ↺ Reset to Defaults
          </button>
        </div>

        {/* Right — Outputs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Row 1: Risk Scorecard */}
          <div className="grid grid-cols-4 gap-4">
            {/* Main risk card */}
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

            {/* Stats */}
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

          {/* Row 2: Heatmap Grid */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Zone Density Heatmap</div>
            <div className="grid grid-cols-5 gap-2">
              {heatCells.map(n => {
                const ratio = Math.min(1, n.currentDensity / n.capacity);
                const hue = Math.round((1 - ratio) * 120); // green(120) → red(0)
                return (
                  <div
                    key={n.id}
                    className="rounded-xl p-2.5 border border-slate-800/40 text-center space-y-1 transition-all duration-500"
                    style={{ background: `hsla(${hue}, 70%, 30%, 0.25)`, borderColor: `hsla(${hue}, 70%, 50%, 0.3)` }}
                    title={`${n.name}: ${Math.round(ratio * 100)}%`}
                  >
                    <div
                      className="text-[9px] font-mono font-bold"
                      style={{ color: `hsl(${hue}, 70%, 65%)` }}
                    >
                      {Math.round(ratio * 100)}%
                    </div>
                    <div className="text-[8px] text-slate-500 font-mono leading-tight truncate">{n.id.replace(/_/g, ' ')}</div>
                    {/* Mini fill bar */}
                    <div className="w-full bg-slate-900/60 rounded-full h-1">
                      <div className="h-1 rounded-full transition-all duration-500"
                        style={{ width: `${ratio * 100}%`, background: `hsl(${hue}, 70%, 55%)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Optimal Route */}
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
                <AlertTriangle className="w-4 h-4 shrink-0" />
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
              { label: 'Hazard Severity', value: `${params.hazardSeverity}/5`, icon: <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" /> },
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
    </motion.div>
  );
};
