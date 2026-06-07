import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSimulation } from '../context/SimulationContext';
import { MapPin, Users, Flame, Info, AlertTriangle, ZoomIn, ZoomOut, Maximize2, LogIn, LogOut, ArrowRightLeft, LayoutDashboard } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CUSTOM NODE COMPONENT
// ─────────────────────────────────────────────────────────────
const CustomVenueNode = ({ data }: { data: Record<string, unknown> }) => {
  const name = data.name as string;
  const currentDensity = data.currentDensity as number;
  const capacity = data.capacity as number;
  const type = data.type as string;
  const isSelected = data.isSelected as boolean;
  const isOnPath = data.isOnPath as boolean;
  const riskLevel = data.riskLevel as string;

  const ratio = currentDensity / capacity;

  let riskColor = 'border-slate-800/80 bg-slate-950/85 text-slate-400';
  let barColor = 'bg-brand-green';
  let stripColor = 'bg-brand-green';

  if (ratio >= 0.9) {
    riskColor = 'border-brand-red/60 bg-slate-950/90 text-brand-red shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse';
    barColor = 'bg-brand-red shadow-[0_0_8px_rgba(239,68,68,0.5)]';
    stripColor = 'bg-brand-red';
  } else if (ratio >= 0.7) {
    riskColor = 'border-brand-orange/50 bg-slate-950/85 text-brand-orange shadow-[0_0_10px_rgba(245,158,11,0.2)]';
    barColor = 'bg-brand-orange shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    stripColor = 'bg-brand-orange';
  } else if (ratio >= 0.5) {
    riskColor = 'border-amber-500/40 bg-slate-950/85 text-amber-500';
    barColor = 'bg-amber-500';
    stripColor = 'bg-amber-500';
  } else {
    riskColor = 'border-brand-green/40 bg-slate-950/85 text-brand-green';
    barColor = 'bg-brand-green';
    stripColor = 'bg-brand-green';
  }

  // Active path / select highlights
  let highlightClass = '';
  if (isOnPath) {
    highlightClass = 'ring-2 ring-brand-blue ring-offset-2 ring-offset-slate-950 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-[1.03] border-brand-blue/80';
  } else if (isSelected) {
    highlightClass = 'ring-2 ring-brand-blue/50 ring-offset-1 ring-offset-slate-950 scale-[1.02] border-brand-blue/60';
  }

  // Node type icon selector
  const getNodeIcon = () => {
    switch (type) {
      case 'ENTRY_GATE':
        return <LogIn className="w-3.5 h-3.5 opacity-80" />;
      case 'EMERGENCY_EXIT':
        return <LogOut className="w-3.5 h-3.5 opacity-80" />;
      case 'CORRIDOR':
        return <ArrowRightLeft className="w-3.5 h-3.5 opacity-80" />;
      case 'HALL':
      default:
        return <LayoutDashboard className="w-3.5 h-3.5 opacity-80" />;
    }
  };

  // Risk zone badge styling
  const riskBadge: Record<string, string> = {
    CRITICAL: 'bg-brand-red/10 text-brand-red border-brand-red/20',
    HIGH: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    MODERATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    SAFE: 'bg-brand-green/10 text-brand-green border-brand-green/20',
  };

  return (
    <div className={`pl-4 pr-5 py-3.5 rounded-2xl border text-left min-w-[200px] backdrop-blur-md transition-all duration-355 hover:border-slate-600 hover:scale-[1.01] relative overflow-hidden ${riskColor} ${highlightClass}`}>
      {/* Handle terminals */}
      <Handle type="target" position={Position.Left} style={{ width: 6, height: 6, background: '#3b82f6', border: '1px solid #0f172a', opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ width: 6, height: 6, background: '#3b82f6', border: '1px solid #0f172a', opacity: 0 }} />

      {/* Decorative Left strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripColor}`} />

      {/* Header telemetry details */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[9px] uppercase tracking-wider font-semibold">
          {getNodeIcon()}
          <span>{type.replace(/_/g, ' ')}</span>
        </div>
        {riskLevel && (
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border font-mono ${riskBadge[riskLevel] || ''}`}>
            {riskLevel}
          </span>
        )}
      </div>

      {/* Node label */}
      <div className="text-xs font-bold text-slate-100 font-sans tracking-tight truncate max-w-[170px]">
        {name}
      </div>

      {/* Stats bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[9px] font-mono text-slate-450 mb-1">
          <span>DENSITY DATA</span>
          <span className="font-semibold text-slate-200">{Math.round(currentDensity)}/{capacity}</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CUSTOM ANIMATED EDGE WITH CROWD PARTICLES
// ─────────────────────────────────────────────────────────────
const CustomAnimatedEdge: React.FC<EdgeProps> = ({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, data,
}) => {
  const hasReverse = (data?.hasReverse as boolean) || false;
  const sourceId = (data?.sourceId as string) || '';
  const targetId = (data?.targetId as string) || '';

  let sY = sourceY;
  let tY = targetY;

  if (hasReverse) {
    const isSourceFirst = sourceId < targetId;
    const offset = isSourceFirst ? -12 : 12;
    sY += offset;
    tY += offset;
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: sY,
    sourcePosition,
    targetX,
    targetY: tY,
    targetPosition,
  });

  const flowRate = (data?.flowRate as number) || 0;
  const capacity = (data?.capacity as number) || 100;
  const isEmergency = (data?.isEmergency as boolean) || false;
  const isOnPath = (data?.isOnPath as boolean) || false;
  const isRunning = (data?.isRunning as boolean) || false;

  const utilization = capacity > 0 ? flowRate / capacity : 0;
  const particleColor = isEmergency ? '#EF4444' : isOnPath ? '#3B82F6' : '#10B981';
  const particleDuration = Math.max(0.8, 3.5 - utilization * 2.5);
  const showParticles = isRunning || isOnPath || isEmergency;

  return (
    <>
      {/* Background glow path (neon tube overlay) */}
      {(isOnPath || isEmergency) && (
        <path
          d={edgePath}
          fill="none"
          stroke={particleColor}
          strokeWidth={style?.strokeWidth ? Number(style.strokeWidth) + 3.5 : 5.5}
          opacity="0.15"
          style={{ filter: 'blur(3px)' }}
        />
      )}

      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Animated crowd particles */}
      {showParticles && (
        <>
          <circle r="3.5" fill={particleColor} opacity="0.95" style={{ filter: `drop-shadow(0 0 5px ${particleColor})` }}>
            <animateMotion dur={`${particleDuration}s`} repeatCount="indefinite" path={edgePath} />
          </circle>
          {utilization > 0.4 && (
            <circle r="2.5" fill={particleColor} opacity="0.65" style={{ filter: `drop-shadow(0 0 4px ${particleColor})` }}>
              <animateMotion dur={`${particleDuration * 1.4}s`} repeatCount="indefinite" begin={`${particleDuration * 0.5}s`} path={edgePath} />
            </circle>
          )}
          {utilization > 0.7 && (
            <circle r="2" fill={particleColor} opacity="0.45" style={{ filter: `drop-shadow(0 0 3px ${particleColor})` }}>
              <animateMotion dur={`${particleDuration * 0.8}s`} repeatCount="indefinite" begin={`${particleDuration * 0.25}s`} path={edgePath} />
            </circle>
          )}
        </>
      )}

      {/* Capacity label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border backdrop-blur-sm shadow-sm ${
            utilization >= 0.9
              ? 'bg-brand-red/20 text-brand-red border-brand-red/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
              : utilization >= 0.6
              ? 'bg-brand-orange/15 text-brand-orange border-brand-orange/25'
              : 'bg-slate-950/80 text-slate-400 border-slate-800/60'
          }`}>
            {flowRate}/{capacity}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = { venueNode: CustomVenueNode };
const edgeTypes = { animatedCrowd: CustomAnimatedEdge };

// ─────────────────────────────────────────────────────────────
// ZOOM CONTROLS PANEL
// ─────────────────────────────────────────────────────────────
const ZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <button
        onClick={() => zoomIn()}
        className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl text-slate-400 hover:text-brand-blue hover:border-brand-blue/40 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-205"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl text-slate-400 hover:text-brand-blue hover:border-brand-blue/40 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-205"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={() => fitView({ padding: 0.15, duration: 450 })}
        className="p-2.5 bg-slate-950/90 border border-slate-800/80 rounded-xl text-slate-400 hover:text-brand-blue hover:border-brand-blue/40 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-205"
        title="Fit View"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN LIVE MAP COMPONENT
// ─────────────────────────────────────────────────────────────
const LiveMapInner: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    selectedPath,
    isEvacuationActive,
    isRunning,
    stats,
  } = useSimulation();

  const getRiskLevel = useCallback((density: number, capacity: number) => {
    const r = density / capacity;
    if (r >= 0.9) return 'CRITICAL';
    if (r >= 0.7) return 'HIGH';
    if (r >= 0.5) return 'MODERATE';
    return 'SAFE';
  }, []);

  const flowNodes = useMemo(() => {
    return nodes.map(node => ({
      id: node.id,
      type: 'venueNode',
      position: { x: node.x, y: node.y },
      data: {
        name: node.name,
        currentDensity: node.currentDensity,
        capacity: node.capacity,
        type: node.type,
        isSelected: selectedNodeId === node.id,
        isOnPath: selectedPath.includes(node.id),
        riskLevel: getRiskLevel(node.currentDensity, node.capacity),
      },
    }));
  }, [nodes, selectedNodeId, selectedPath, getRiskLevel]);

  const flowEdges = useMemo(() => {
    return edges.map(edge => {
      let isOnSelectedPath = false;
      for (let i = 0; i < selectedPath.length - 1; i++) {
        if (selectedPath[i] === edge.source && selectedPath[i + 1] === edge.target) {
          isOnSelectedPath = true;
          break;
        }
      }

      const flowColor = isEvacuationActive
        ? '#EF4444'
        : isOnSelectedPath
        ? '#3B82F6'
        : '#475569';

      const strokeW = isOnSelectedPath || isEvacuationActive ? 3.5 : 1.5;

      // Check if there is an edge in the reverse direction
      const hasReverse = edges.some(e => e.source === edge.target && e.target === edge.source);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'animatedCrowd',
        animated: false, // We handle our own animation in the custom edge
        style: {
          stroke: flowColor,
          strokeWidth: strokeW,
          transition: 'stroke 0.4s, stroke-width 0.4s',
          filter: isOnSelectedPath || isEvacuationActive
            ? `drop-shadow(0 0 6px ${flowColor})`
            : 'none',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: flowColor,
        },
        data: {
          flowRate: edge.currentFlow,
          capacity: edge.capacity,
          isEmergency: isEvacuationActive,
          isOnPath: isOnSelectedPath,
          isRunning,
          hasReverse,
          sourceId: edge.source,
          targetId: edge.target,
        },
      };
    });
  }, [edges, selectedPath, isEvacuationActive, isRunning]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const riskColors = {
    SAFE: { badge: 'text-brand-green bg-brand-green/10 border-brand-green/20', bar: 'bg-brand-green' },
    MODERATE: { badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20', bar: 'bg-amber-400' },
    HIGH: { badge: 'text-brand-orange bg-brand-orange/10 border-brand-orange/20', bar: 'bg-brand-orange' },
    CRITICAL: { badge: 'text-brand-red bg-brand-red/10 border-brand-red/20 animate-pulse', bar: 'bg-brand-red' },
  };

  const rLevel = stats.riskLevel || 'SAFE';

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full">
      {/* React Flow Panel */}
      <div className="flex-1 h-full relative bg-[#090d16]">
        {/* Neon sci-fi ambient glow background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.04),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(239,68,68,0.03),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.15)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.25}
          maxZoom={2}
        >
          {/* Transparent grid overlay */}
          <Background color="#1e293b" gap={24} size={1} style={{ opacity: 0.3 }} />
          <Controls showInteractive={false} className="!bg-slate-950/90 !border-slate-800/80 !rounded-2xl !shadow-2xl" />
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as Record<string, unknown>;
              const rl = d?.riskLevel as string;
              if (rl === 'CRITICAL') return '#EF4444';
              if (rl === 'HIGH') return '#F97316';
              if (rl === 'MODERATE') return '#F59E0B';
              return '#10B981';
            }}
            maskColor="rgba(3,7,18,0.85)"
            className="!bg-slate-950/95 !border !border-slate-800/80 !rounded-2xl !shadow-2xl"
            style={{ bottom: 16, right: 16 }}
          />
          <ZoomControls />
        </ReactFlow>

        {/* Stampede Risk Overlay Banner */}
        {(rLevel === 'HIGH' || rLevel === 'CRITICAL') && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-2.5 rounded-xl border font-mono text-xs font-bold backdrop-blur-md ${
            rLevel === 'CRITICAL'
              ? 'bg-brand-red/15 border-brand-red/40 text-brand-red animate-pulse shadow-glow-red'
              : 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange shadow-glow-orange'
          }`}>
            <AlertTriangle className="w-4 h-4" />
            STAMPEDE RISK: {rLevel} — Score {stats.riskScore}/100 · Probability {stats.stampedeProbability}%
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 glass-panel border-slate-800/60 p-4 rounded-xl z-10 text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] font-mono mb-2">Node Density Levels</div>
          {[
            { color: 'bg-brand-green shadow-glow-green', label: 'Safe (<50%)' },
            { color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]', label: 'Moderate (50–70%)' },
            { color: 'bg-brand-orange shadow-glow-orange', label: 'High (70–90%)' },
            { color: 'bg-brand-red shadow-glow-red animate-pulse', label: 'Critical (≥90%)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-slate-400 font-mono">{label}</span>
            </div>
          ))}
          <div className="border-t border-slate-800/50 pt-2 mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-brand-blue shadow-glow-blue" />
              <span className="text-slate-400 font-mono">Active Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-brand-red shadow-glow-red" />
              <span className="text-slate-400 font-mono">Emergency Egress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800/60 glass-panel p-6 flex flex-col space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white font-sans flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-brand-blue" />
            <span>Venue Layout Viewer</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Click on any map node to load telemetry stats.
          </p>
        </div>

        {/* Stampede Risk Predictor Card */}
        <div className={`p-4 rounded-xl border space-y-3 ${riskColors[rLevel].badge}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-70">Stampede Risk Score</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${riskColors[rLevel].badge}`}>
              {rLevel}
            </span>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold">{stats.riskScore}</span>
            <span className="text-lg font-bold opacity-60 mb-0.5">/100</span>
          </div>

          <div className="w-full bg-slate-950/50 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${riskColors[rLevel].bar}`}
              style={{ width: `${stats.riskScore}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
            <div className="bg-slate-950/40 rounded-lg p-2 space-y-1">
              <div className="opacity-60">Avg Density</div>
              <div className="font-bold text-slate-200">{((stats.avgDensityRatio || 0) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-950/40 rounded-lg p-2 space-y-1">
              <div className="opacity-60">Flow Util.</div>
              <div className="font-bold text-slate-200">{((stats.maxFlowUtilization || 0) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-950/40 rounded-lg p-2 space-y-1">
              <div className="opacity-60">Bottlenecks</div>
              <div className="font-bold text-slate-200">{stats.bottleneckCount || 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono border-t border-current/20 pt-2">
            <span className="opacity-60">Stampede Probability</span>
            <span className="font-bold">{stats.stampedeProbability || 0}%</span>
          </div>
        </div>

        {selectedNode ? (
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Location Name</span>
              <h3 className="text-lg font-bold text-white tracking-tight">{selectedNode.name}</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded mt-1.5 inline-block">
                ID: {selectedNode.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 font-mono">
                <span className="text-[10px] text-slate-500 block">Density</span>
                <span className="text-lg font-bold text-white flex items-center space-x-1 mt-0.5">
                  <Users className="w-4 h-4 mr-1 text-brand-blue" />
                  {Math.round(selectedNode.currentDensity)}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 font-mono">
                <span className="text-[10px] text-slate-500 block">Capacity Limit</span>
                <span className="text-lg font-bold text-slate-300 mt-0.5">{selectedNode.capacity}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>Occupancy Rate</span>
                <span className="font-semibold text-slate-200">
                  {Math.round((selectedNode.currentDensity / selectedNode.capacity) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-850">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (selectedNode.currentDensity / selectedNode.capacity) >= 0.9
                      ? 'bg-brand-red shadow-glow-red animate-pulse'
                      : (selectedNode.currentDensity / selectedNode.capacity) >= 0.7
                      ? 'bg-brand-orange shadow-glow-orange'
                      : 'bg-brand-blue'
                  }`}
                  style={{ width: `${Math.round((selectedNode.currentDensity / selectedNode.capacity) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Outgoing Corridors</span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {edges.filter(e => e.source === selectedNode.id).map(edge => {
                  const destNode = nodes.find(n => n.id === edge.target);
                  const util = edge.capacity > 0 ? edge.currentFlow / edge.capacity : 0;
                  return (
                    <div key={edge.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300">➔ {destNode?.name || edge.target}</span>
                        <span className="font-mono font-bold text-brand-blue">{edge.currentFlow}/{edge.capacity} f/s</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${util >= 0.9 ? 'bg-brand-red' : util >= 0.6 ? 'bg-brand-orange' : 'bg-brand-blue'}`}
                          style={{ width: `${Math.min(100, util * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Distance: {edge.distance}m · Util: {(util * 100).toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(selectedNode.currentDensity / selectedNode.capacity) >= 0.7 && (
              <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-3.5 flex items-start space-x-2.5 text-brand-red">
                <Flame className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
                <p className="text-[11px] leading-normal font-sans">
                  <strong>Risk Warning:</strong> Critical crowd build-up detected. Consider emergency evacuation triggers or pathfinding adjustments.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-xs text-center py-8 space-y-3">
            <Info className="w-7 h-7 text-slate-600" />
            <p className="max-w-[200px] leading-relaxed">Select any venue node on the graph to display operational statistics.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveMap: React.FC = () => (
  <ReactFlowProvider>
    <LiveMapInner />
  </ReactFlowProvider>
);
