import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import { Zap, HelpCircle, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

export const Heatmap: React.FC = () => {
  const { nodes } = useSimulation();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Sort nodes alphabetically or by ID to ensure a stable vertical list
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  // Compute mini statistics
  const totalOccupancy = nodes.reduce((sum, n) => sum + n.currentDensity, 0);
  const totalCapacity = nodes.reduce((sum, n) => sum + n.capacity, 0);
  const avgDensity = Math.round((totalOccupancy / totalCapacity) * 100);

  const peakNode = [...nodes].sort((a, b) => 
    (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity)
  )[0];

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="space-y-8 p-8 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Crowd Density Heatmap
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Detailed grid density levels mapped by venue locations.
        </p>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Progress List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono mb-6">
              Location Heat Index
            </h3>

            <div className="space-y-5">
              {sortedNodes.map((node) => {
                const ratio = node.currentDensity / node.capacity;
                const percentage = Math.round(ratio * 100);
                
                // Color codes
                let barColor = 'bg-brand-green';
                let textColor = 'text-brand-green';
                
                if (ratio >= 0.9) {
                  barColor = 'bg-brand-red';
                  textColor = 'text-brand-red';
                } else if (ratio >= 0.7) {
                  barColor = 'bg-brand-orange';
                  textColor = 'text-brand-orange';
                } else if (ratio >= 0.5) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-500';
                } else {
                  barColor = 'bg-brand-green';
                  textColor = 'text-brand-green';
                }

                // Custom ASCII progress bar representation (8 characters)
                const hashesCount = Math.round(ratio * 8);
                const asciiBar = '#'.repeat(Math.min(8, hashesCount)) + '-'.repeat(Math.max(0, 8 - hashesCount));

                return (
                  <motion.div
                    key={node.id}
                    variants={itemVariants}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="relative group flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border border-slate-800/40 bg-slate-900/30 hover:bg-slate-900/60 transition-colors duration-250 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4 mb-2 md:mb-0">
                      <div className="w-24 text-slate-400 font-bold text-xs truncate font-mono">
                        {node.id}
                      </div>
                      <div className="text-slate-200 text-xs font-semibold truncate max-w-[150px]">
                        {node.name}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* 8-Character ASCII representation */}
                      <span className="font-mono text-xs font-semibold tracking-wider text-slate-500 group-hover:text-slate-350 transition-colors">
                        [{asciiBar}]
                      </span>

                      {/* Density progress indicator */}
                      <div className="w-32 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Percentage and numbers */}
                      <span className={`w-16 text-right font-mono text-xs font-bold ${textColor}`}>
                        {percentage}%
                      </span>
                    </div>

                    {/* Hover Tooltip Overlay */}
                    {hoveredNodeId === node.id && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 rounded-xl p-3 z-30 shadow-2xl text-[11px] font-mono w-52 pointer-events-none">
                        <div className="font-bold text-slate-200 border-b border-slate-850 pb-1 mb-1 truncate">{node.name}</div>
                        <div className="flex justify-between text-slate-400">
                          <span>Density:</span>
                          <span className="font-bold text-slate-300">{Math.round(node.currentDensity)}/m²</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Capacity:</span>
                          <span className="font-bold text-slate-300">{node.capacity} people</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mini Stats Panel & Legend */}
        <div className="space-y-6">
          {/* Mini Stats Card */}
          <GlassCard glowColor="none" className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Zap className="w-4 h-4 mr-1.5 text-brand-blue" />
              <span>Telemetry metrics</span>
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Average Venue load</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-bold text-white">{avgDensity}%</span>
                  <span className="text-xs text-slate-500 font-mono">occupancy</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Peak Load Area</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-200 truncate max-w-[150px]">
                    {peakNode ? peakNode.name : 'N/A'}
                  </span>
                  <span className={`text-sm font-mono font-bold ${
                    peakNode && (peakNode.currentDensity / peakNode.capacity) >= 0.9 ? 'text-brand-red' : 'text-brand-orange'
                  }`}>
                    {peakNode ? Math.round((peakNode.currentDensity / peakNode.capacity) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Legend Details */}
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <HelpCircle className="w-4 h-4 mr-1.5 text-brand-orange" />
              <span>Heatmap Legend</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-start space-x-3 p-2.5 rounded-xl border border-brand-green/20 bg-brand-green/5">
                <ShieldCheck className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-brand-green block">SAFE</span>
                  <span className="text-[10px] text-slate-400">Density below 50% limit. Crowd is moving freely.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-500 block">MODERATE</span>
                  <span className="text-[10px] text-slate-400">Density between 50% - 70%. High awareness area.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl border border-brand-orange/20 bg-brand-orange/5">
                <AlertTriangle className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-brand-orange block">HIGH RISK</span>
                  <span className="text-[10px] text-slate-400">Density between 70% - 90%. Bottlenecks forming.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl border border-brand-red/20 bg-brand-red/5 animate-pulse">
                <Flame className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-brand-red block">CRITICAL DANGER</span>
                  <span className="text-[10px] text-slate-400">Density exceeds 90%. Stampede risks!</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};
