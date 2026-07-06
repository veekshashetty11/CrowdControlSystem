import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ReactFlow, Controls, Background, Handle, Position,
  MarkerType, BaseEdge, getBezierPath, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import {
  Play, Pause, RotateCcw, Zap, Radio, Activity,
  Users, AlertTriangle, Gauge, Maximize2, ZoomIn, ZoomOut,
} from 'lucide-react';

// ─── Circular Twin Node ────────────────────────────────────────────────────
const TwinNode = ({ data }: { data: Record<string, unknown> }) => {
  const density   = data.currentDensity as number;
  const capacity  = data.capacity as number;
  const name      = data.name as string;
  const isHazard  = data.isHazard as boolean;

  const ratio = Math.min(1, density / capacity);
  const pct   = Math.round(ratio * 100);

  const ring = isHazard ? '#EF4444'
    : ratio >= 0.9 ? '#EF4444'
    : ratio >= 0.7 ? '#F59E0B'
    : ratio >= 0.5 ? '#FBBF24'
    : '#10B981';

  const R   = 34;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - ratio);
  const isPulsing = ratio >= 0.7 || isHazard;

  return (
    <div style={{ position: 'relative', width: 88, height: 108 }}>
      <Handle type="target" position={Position.Left}  style={{ opacity: 0, width: 6, height: 6, top: 44 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 6, height: 6, top: 44 }} />

      {/* SVG ring */}
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* outer glow */}
        {isPulsing && <circle cx="44" cy="44" r="40" fill="none" stroke={ring} strokeWidth="6" opacity="0.12" />}
        {/* track */}
        <circle cx="44" cy="44" r={R} fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* progress arc */}
        <circle
          cx="44" cy="44" r={R}
          fill="none"
          stroke={ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '44px 44px', transition: 'stroke-dashoffset 1s ease, stroke 0.6s ease' }}
        />
        {/* inner fill tint */}
        <circle cx="44" cy="44" r="26" fill={ring} opacity="0.07" />
        {/* hazard lightning */}
        {isHazard && (
          <text x="44" y="48" textAnchor="middle" fontSize="14" fill="#EF4444" style={{ fontFamily: 'monospace' }}>⚠</text>
        )}
      </svg>

      {/* Percentage text */}
      {!isHazard && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 88, height: 88,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: ring, fontFamily: 'monospace', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 7, color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', marginTop: 2 }}>
            {Math.round(density)}/{capacity}
          </span>
        </div>
      )}

      {/* Name label */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        fontSize: 7.5, color: 'rgba(148,163,184,0.75)', fontFamily: 'monospace',
        whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
        textAlign: 'center',
      }}>
        {name}
      </div>

      {/* Pulse ring for critical */}
      {isPulsing && (
        <div style={{
          position: 'absolute', top: -4, left: -4, width: 96, height: 96,
          borderRadius: '50%', border: `2px solid ${ring}`,
          animation: 'ping 1.5s ease-in-out infinite',
          opacity: 0.35,
        }} />
      )}
    </div>
  );
};

// ─── Animated Twin Edge ────────────────────────────────────────────────────
const TwinEdge: React.FC<EdgeProps> = ({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd, data,
}) => {
  const flowRate   = (data?.flowRate   as number)  || 0;
  const cap        = (data?.capacity   as number)  || 100;
  const isRunning  = (data?.isRunning  as boolean) || false;
  const isEmergency = (data?.isEmergency as boolean) || false;
  const isHazard   = (data?.isHazard   as boolean) || false;

  const util   = cap > 0 ? flowRate / cap : 0;
  const color  = isHazard || isEmergency ? '#EF4444'
    : util >= 0.7 ? '#F59E0B'
    : util >= 0.4 ? '#FBBF24'
    : '#10B981';

  const thickness = 1 + util * 5;
  const speed     = Math.max(0.6, 3.2 - util * 2.4);
  const particles = util > 0.6 ? 3 : util > 0.25 ? 2 : 1;

  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <path d={edgePath} fill="none" stroke={color}
        strokeWidth={thickness + 4} opacity={0.08} style={{ filter: 'blur(5px)' }} />
      <BaseEdge path={edgePath} style={{ ...style, stroke: color, strokeWidth: thickness }} markerEnd={markerEnd} />

      {(isRunning || isEmergency) && Array.from({ length: particles }, (_, i) => (
        <circle key={i} r={3} fill={color} opacity={0.9}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
          <animateMotion
            dur={`${speed * (1 + i * 0.45)}s`}
            repeatCount="indefinite"
            begin={`${i * speed * 0.33}s`}
            path={edgePath}
          />
        </circle>
      ))}
    </>
  );
};

const nodeTypes = { twin: TwinNode };
const edgeTypes = { twin: TwinEdge };

// ─── Zoom Controls ─────────────────────────────────────────────────────────
const ZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const btn = 'p-2 bg-slate-950/90 border border-slate-800/80 rounded-xl text-slate-400 hover:text-brand-blue hover:border-brand-blue/40 transition-all duration-200';
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <button className={btn} onClick={() => zoomIn()}><ZoomIn className="w-4 h-4" /></button>
      <button className={btn} onClick={() => zoomOut()}><ZoomOut className="w-4 h-4" /></button>
      <button className={btn} onClick={() => fitView({ padding: 0.15, duration: 500 })}><Maximize2 className="w-4 h-4" /></button>
    </div>
  );
};

// ─── Main Inner Component ──────────────────────────────────────────────────
const DigitalTwinInner: React.FC = () => {
  const {
    nodes, edges, isRunning, isEvacuationActive, stats, activeHazards,
    startSimulation, pauseSimulation, resetSimulation,
    simulationSpeed, setSimulationSpeed,
  } = useSimulation();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  const handleReset = useCallback(() => {
    resetSimulation();
    setElapsedSeconds(0);
  }, [resetSimulation]);

  const hazardNodeIds = useMemo(() => new Set(activeHazards.map(h => h.nodeId)), [activeHazards]);

  const flowNodes = useMemo(() => nodes.map(n => ({
    id: n.id,
    type: 'twin',
    position: { x: n.x, y: n.y },
    data: {
      name: n.name,
      currentDensity: n.currentDensity,
      capacity: n.capacity,
      type: n.type,
      isHazard: hazardNodeIds.has(n.id),
    },
  })), [nodes, hazardNodeIds]);

  const flowEdges = useMemo(() => edges.map(e => {
    const srcHazard = hazardNodeIds.has(e.source);
    const tgtHazard = hazardNodeIds.has(e.target);
    const color = isEvacuationActive || srcHazard || tgtHazard ? '#EF4444'
      : e.currentFlow / e.capacity > 0.7 ? '#F59E0B'
      : '#334155';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'twin',
      style: { stroke: color, strokeWidth: 1 + (e.currentFlow / e.capacity) * 5, transition: 'all 0.8s' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
      data: {
        flowRate: e.currentFlow,
        capacity: e.capacity,
        isRunning,
        isEmergency: isEvacuationActive,
        isHazard: srcHazard || tgtHazard,
      },
    };
  }), [edges, isRunning, isEvacuationActive, hazardNodeIds]);

  const riskColor = stats.riskLevel === 'CRITICAL' ? 'text-brand-red'
    : stats.riskLevel === 'HIGH' ? 'text-brand-orange'
    : stats.riskLevel === 'MODERATE' ? 'text-amber-400'
    : 'text-brand-green';

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#060a12] relative overflow-hidden">

      {/* ── Top HUD ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl z-20 shrink-0">
        {/* Brand + status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isRunning ? 'text-brand-green animate-pulse' : 'text-slate-600'}`} />
            <span className="text-sm font-bold tracking-wider text-white font-mono">DIGITAL TWIN</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isRunning ? 'border-brand-green/30 text-brand-green bg-brand-green/10' : 'border-slate-700 text-slate-500 bg-slate-900'
            }`}>{isRunning ? 'LIVE' : 'PAUSED'}</span>
          </div>
          {/* Timer */}
          <span className="text-[11px] font-mono text-slate-500 tracking-widest">{fmt(elapsedSeconds)}</span>
        </div>

        {/* Controls center */}
        <div className="flex items-center gap-2">
          <button
            onClick={isRunning ? pauseSimulation : startSimulation}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono border transition-all ${
              isRunning
                ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/20'
                : 'bg-brand-green/10 border-brand-green/30 text-brand-green hover:bg-brand-green/20'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

          {/* Speed presets */}
          <div className="flex items-center gap-1 ml-2 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSimulationSpeed(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  simulationSpeed === s
                    ? 'bg-brand-blue text-white shadow-glow-blue'
                    : 'text-slate-500 hover:text-white'
                }`}
              >×{s}</button>
            ))}
          </div>
        </div>

        {/* Live metrics tape */}
        <div className="flex items-center gap-5 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-brand-blue" />
            <span className="text-slate-300 font-bold">{stats.totalCrowd.toLocaleString()}</span>
            <span>crowd</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-brand-orange" />
            <span className={`font-bold ${riskColor}`}>{stats.riskScore}</span>
            <span>risk</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-slate-300 font-bold">{stats.activeZones}</span>
            <span>zones</span>
          </div>
          {activeHazards.length > 0 && (
            <div className="flex items-center gap-1.5 text-brand-red animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold">{activeHazards.length} HAZARD{activeHazards.length > 1 ? 'S' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Ambient glow layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.04),transparent_55%)] pointer-events-none" />
        {isEvacuationActive && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05),transparent_60%)] pointer-events-none animate-pulse" />
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={28} size={1} style={{ opacity: 0.25 }} />
          <Controls showInteractive={false} className="!bg-slate-950/90 !border-slate-800/80 !rounded-2xl" />
          <ZoomControls />
        </ReactFlow>

        {/* Emergency banner */}
        <AnimatePresence>
          {isEvacuationActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-2.5 rounded-xl border bg-brand-red/15 border-brand-red/40 text-brand-red font-mono text-xs font-bold animate-pulse shadow-glow-red"
            >
              <AlertTriangle className="w-4 h-4" />
              EMERGENCY EVACUATION ACTIVE — Risk {stats.riskScore}/100
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-950/85 border border-slate-800/70 backdrop-blur-md rounded-xl p-3 text-[9px] font-mono space-y-1.5 z-10">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Density Ring</div>
          {[
            { color: '#10B981', label: 'Safe  < 50%' },
            { color: '#FBBF24', label: 'Mod   50–70%' },
            { color: '#F59E0B', label: 'High  70–90%' },
            { color: '#EF4444', label: 'Crit  ≥ 90%' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Speed / status widget bottom-right */}
        <div className="absolute bottom-4 right-4 bg-slate-950/85 border border-slate-800/70 backdrop-blur-md rounded-xl p-3 z-10">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <Zap className="w-3.5 h-3.5 text-brand-blue" />
            <span className="text-slate-400">Speed</span>
            <span className="text-brand-blue font-bold">×{simulationSpeed}</span>
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-500">
            {stats.congestedAreas} congested · {stats.bottleneckCount} bottleneck{stats.bottleneckCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DigitalTwin: React.FC = () => (
  <ReactFlowProvider>
    <DigitalTwinInner />
  </ReactFlowProvider>
);
