import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Clock, HelpCircle, GitCommit, CornerDownRight } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const AlgorithmPanel: React.FC = () => {
  const { activeAlgorithm, setActiveAlgorithm } = useSimulation();

  if (!activeAlgorithm) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="fixed bottom-6 right-6 w-96 glass-panel border border-brand-blue/30 rounded-2xl shadow-glow-blue overflow-hidden z-50"
      >
        {/* Header */}
        <div className="bg-brand-blue/15 border-b border-brand-blue/20 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-brand-blue">
            <Cpu className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            <h3 className="font-semibold text-sm tracking-wide uppercase font-mono">Algorithm Processor</h3>
          </div>
          <button 
            onClick={() => setActiveAlgorithm(null)}
            className="text-xs text-slate-500 hover:text-slate-350 font-mono hover:bg-slate-800/60 px-2 py-0.5 rounded"
          >
            Dismiss
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-0.5">Algorithm Name</span>
            <span className="text-base font-bold text-white tracking-tight">{activeAlgorithm.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-slate-800/60 py-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center space-x-1">
                <HelpCircle className="w-3 h-3 mr-0.5" /> Complexity
              </span>
              <span className="text-sm font-semibold text-slate-300 font-mono">{activeAlgorithm.complexity}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center space-x-1">
                <Clock className="w-3 h-3 mr-0.5" /> Exec Time
              </span>
              <span className="text-sm font-semibold text-slate-300 font-mono">{activeAlgorithm.executionTime} ms</span>
            </div>
          </div>

          {/* Visited Nodes Step-by-Step */}
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center mb-2">
              <GitCommit className="w-3.5 h-3.5 mr-1 text-brand-blue" /> Nodes Visited / Traversed
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {activeAlgorithm.visitedNodes.length === 0 ? (
                <span className="text-xs text-slate-600 font-mono">No nodes visited.</span>
              ) : (
                activeAlgorithm.visitedNodes.map((nodeId, idx) => (
                  <motion.span
                    key={`${nodeId}-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800/70 text-slate-300"
                  >
                    {nodeId}
                  </motion.span>
                ))
              )}
            </div>
          </div>

          {/* Decision output */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center">
              <CornerDownRight className="w-3.5 h-3.5 mr-1 text-brand-green" /> Engine Decision
            </span>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeAlgorithm.decision}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
