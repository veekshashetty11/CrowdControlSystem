import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  Handle, 
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSimulation } from '../context/SimulationContext';
import { MapPin, Users, Flame, Info } from 'lucide-react';

// Custom Node component for React Flow
const CustomVenueNode = ({ data }: any) => {
  const { name, currentDensity, capacity, type, isSelected } = data;
  const ratio = currentDensity / capacity;
  
  let riskColor = 'border-brand-green bg-slate-900/90 shadow-glow-green text-brand-green';
  let barColor = 'bg-brand-green';
  
  if (ratio >= 0.9) {
    riskColor = 'border-brand-red bg-slate-900/95 shadow-glow-red text-brand-red animate-pulse-fast';
    barColor = 'bg-brand-red';
  } else if (ratio >= 0.7) {
    riskColor = 'border-brand-orange bg-slate-900/90 shadow-glow-orange text-brand-orange';
    barColor = 'bg-brand-orange';
  } else if (ratio >= 0.5) {
    riskColor = 'border-amber-500/50 bg-slate-900/90 shadow-[0_0_10px_rgba(245,158,11,0.25)] text-amber-500';
    barColor = 'bg-amber-500';
  } else {
    riskColor = 'border-brand-green/45 bg-slate-900/90 shadow-[0_0_10px_rgba(16,185,129,0.15)] text-brand-green';
    barColor = 'bg-brand-green';
  }

  const selectOutline = isSelected 
    ? 'ring-2 ring-brand-blue ring-offset-2 ring-offset-brand-bg scale-[1.03]' 
    : 'hover:scale-[1.01]';

  return (
    <div className={`px-4 py-2.5 rounded-xl border text-left min-w-[180px] backdrop-blur-md transition-all ${riskColor} ${selectOutline}`}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      
      <div className="text-[9px] uppercase tracking-wider font-mono opacity-50 mb-0.5">{type.replace('_', ' ')}</div>
      <div className="text-xs font-bold text-slate-100 font-sans tracking-tight truncate max-w-[160px]">{name}</div>
      
      <div className="mt-2.5">
        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
          <span>Density</span>
          <span className="font-semibold text-slate-200">{Math.round(currentDensity)}/{capacity}</span>
        </div>
        <div className="w-full bg-slate-950/80 rounded-full h-1 border border-slate-800/20 overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

// React Flow needs the nodeTypes registered outside of render or memoized
const nodeTypes = {
  venueNode: CustomVenueNode,
};

export const LiveMap: React.FC = () => {
  const { 
    nodes, 
    edges, 
    selectedNodeId, 
    setSelectedNodeId, 
    selectedPath, 
    isEvacuationActive, 
    isRunning 
  } = useSimulation();

  // Convert Context nodes to React Flow nodes
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
        isSelected: selectedNodeId === node.id
      },
    }));
  }, [nodes, selectedNodeId]);

  // Convert Context edges to React Flow edges
  const flowEdges = useMemo(() => {
    return edges.map(edge => {
      // Check if this edge is traversed in the active route optimizer path
      let isOnSelectedPath = false;
      for (let i = 0; i < selectedPath.length - 1; i++) {
        if (selectedPath[i] === edge.source && selectedPath[i+1] === edge.target) {
          isOnSelectedPath = true;
          break;
        }
      }

      const flowColor = isEvacuationActive 
        ? '#EF4444' 
        : isOnSelectedPath 
        ? '#3B82F6' 
        : '#334155';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: isRunning || isOnSelectedPath || isEvacuationActive,
        style: { 
          stroke: flowColor, 
          strokeWidth: isOnSelectedPath || isEvacuationActive ? 3.5 : 1.5,
          transition: 'stroke 0.3s, stroke-width 0.3s'
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: flowColor,
        },
      };
    });
  }, [edges, selectedPath, isEvacuationActive, isRunning]);

  // Get active selected node info
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full">
      {/* React Flow Graph Editor Panel */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#334155" gap={16} size={1} />
          <Controls />
        </ReactFlow>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 glass-panel border-slate-800/60 p-4 rounded-xl z-10 text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[10px] font-mono mb-2">Node Density Levels</div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green shadow-glow-green"></span>
            <span className="text-slate-400 font-mono">Safe (&lt;50%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            <span className="text-slate-400 font-mono">Moderate (50%-70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-orange shadow-glow-orange"></span>
            <span className="text-slate-400 font-mono">High (70%-90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-red shadow-glow-red animate-pulse"></span>
            <span className="text-slate-400 font-mono">Critical (&ge;90%)</span>
          </div>
        </div>
      </div>

      {/* Selected Node Details Side Drawer */}
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

        {selectedNode ? (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Location Name</span>
              <h3 className="text-lg font-bold text-white tracking-tight">{selectedNode.name}</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded mt-1.5 inline-block">
                ID: {selectedNode.id}
              </span>
            </div>

            {/* Capacity / Density details */}
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

            {/* Progress Bar status */}
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

            {/* Outgoing edges summary */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Outgoing Paths</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {edges.filter(e => e.source === selectedNode.id).map(edge => {
                  const destNode = nodes.find(n => n.id === edge.target);
                  return (
                    <div key={edge.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-300">➔ {destNode?.name || edge.target}</span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Distance: {edge.distance}m | Capacity: {edge.capacity}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-brand-blue">{edge.currentFlow} f/s</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alert Warning if high density */}
            {(selectedNode.currentDensity / selectedNode.capacity) >= 0.7 && (
              <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-3.5 flex items-start space-x-2.5 text-brand-red">
                <Flame className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
                <p className="text-[11px] leading-normal font-sans">
                  <strong>Risk Warning:</strong> Critical crowd build-up detected. Consider emergency evacuation triggers or pathfinding adjustments to clear this bottleneck.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono text-xs text-center py-16 space-y-3">
            <Info className="w-7 h-7 text-slate-600" />
            <p className="max-w-[200px] leading-relaxed">Select any venue node on the graph to display operational statistics.</p>
          </div>
        )}
      </div>
    </div>
  );
};
