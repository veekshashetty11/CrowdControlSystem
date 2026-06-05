import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimulation } from '../context/SimulationContext';
import { GlassCard } from '../components/GlassCard';
import {
  findSafestPathAStar,
  computeMaxFlow,
  runMultiSourceBFS,
  runTopologicalSort,
  runDFS,
  SegmentTree,
} from '../utils/algorithms';
import { Cpu, Zap, Clock, MemoryStick, Play, TrendingUp } from 'lucide-react';

interface AlgorithmInfo {
  key: string;
  name: string;
  category: string;
  purpose: string;
  timeComplexity: string;
  spaceComplexity: string;
  color: string;
  glowColor: 'blue' | 'green' | 'orange' | 'red' | 'none';
  execTime: number | null;
  result: string;
}

const algorithmsMeta: Omit<AlgorithmInfo, 'execTime' | 'result'>[] = [
  {
    key: 'astar',
    name: 'A* Pathfinding',
    category: 'Graph Traversal',
    purpose: 'Finds the shortest congestion-aware evacuation path using a heuristic-guided priority queue. Balances actual cost g(n) with estimated distance h(n).',
    timeComplexity: 'O(E log V)',
    spaceComplexity: 'O(V)',
    color: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5',
    glowColor: 'blue',
  },
  {
    key: 'bfs',
    name: 'Multi-Source BFS',
    category: 'Graph Traversal',
    purpose: 'Labels each venue node with its nearest emergency exit and minimum hop distance. Guarantees shortest hop-count paths from any zone.',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    color: 'text-brand-green border-brand-green/30 bg-brand-green/5',
    glowColor: 'green',
  },
  {
    key: 'dfs',
    name: 'Depth-First Search',
    category: 'Graph Traversal',
    purpose: 'Explores all reachable zones from a source using a stack-based deep traversal. Used for connectivity analysis and cycle detection.',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    color: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
    glowColor: 'none',
  },
  {
    key: 'ford_fulkerson',
    name: 'Ford-Fulkerson (Edmonds-Karp)',
    category: 'Network Flow',
    purpose: 'Computes maximum evacuation throughput from all entry gates to exits. Uses BFS to find augmenting paths for optimal flow allocation across corridors.',
    timeComplexity: 'O(V · E²)',
    spaceComplexity: 'O(V²)',
    color: 'text-brand-red border-brand-red/30 bg-brand-red/5',
    glowColor: 'red',
  },
  {
    key: 'topo_sort',
    name: 'Topological Sort (Kahn\'s)',
    category: 'Scheduling',
    purpose: 'Computes a dependency-respecting evacuation order through the venue DAG. Ensures zones are evacuated in a logically consistent sequence.',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    color: 'text-brand-orange border-brand-orange/30 bg-brand-orange/5',
    glowColor: 'orange',
  },
  {
    key: 'segment_tree',
    name: 'Segment Tree',
    category: 'Data Structure',
    purpose: 'Enables O(log n) range sum/min/max queries over zone density arrays. Supports fast crowd density monitoring across contiguous venue segments.',
    timeComplexity: 'O(log n) query / O(n) build',
    spaceComplexity: 'O(n)',
    color: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    glowColor: 'none',
  },
];

export const DaaInsights: React.FC = () => {
  const { nodes, edges } = useSimulation();
  const [algorithms, setAlgorithms] = useState<AlgorithmInfo[]>(
    algorithmsMeta.map(a => ({ ...a, execTime: null, result: 'Not yet run' }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkRan, setBenchmarkRan] = useState(false);

  const runBenchmarks = () => {
    setIsRunning(true);
    const results = [...algorithmsMeta.map(a => ({ ...a, execTime: null as number | null, result: 'Running...' }))];
    setAlgorithms(results);

    setTimeout(() => {
      const entries = nodes.filter(n => n.type === 'ENTRY_GATE').map(n => n.id);
      const exits = nodes.filter(n => n.type === 'EMERGENCY_EXIT').map(n => n.id);
      const sourceId = entries[0] || nodes[0]?.id || 'Gate_A';
      const targetId = exits[0] || nodes[nodes.length - 1]?.id || 'Exit_A';

      const updated: AlgorithmInfo[] = algorithmsMeta.map(meta => {
        let execTime = 0;
        let resultStr = '';

        try {
          if (meta.key === 'astar') {
            const res = findSafestPathAStar(nodes, edges, sourceId, targetId);
            execTime = res.executionTime;
            resultStr = res.path.length > 0
              ? `Path: ${res.path.join(' → ')} (Cost: ${res.totalCost.toFixed(1)})`
              : 'No path found';
          } else if (meta.key === 'bfs') {
            const t0 = performance.now();
            const res = runMultiSourceBFS(nodes, edges, exits);
            execTime = parseFloat((performance.now() - t0).toFixed(3));
            const labeled = Array.from(res.entries()).filter(([, v]) => v.nearestExitId !== 'None').length;
            resultStr = `${labeled} nodes labeled with nearest exit`;
          } else if (meta.key === 'dfs') {
            const res = runDFS(nodes, edges, sourceId);
            execTime = res.executionTime;
            resultStr = `Traversal order: ${res.visitedOrder.join(' → ')}`;
          } else if (meta.key === 'ford_fulkerson') {
            const res = computeMaxFlow(nodes, edges, entries, exits);
            execTime = res.executionTime;
            resultStr = `Max flow: ${res.maxFlow} p/s | Bottlenecks: ${res.bottlenecks.length}`;
          } else if (meta.key === 'topo_sort') {
            const t0 = performance.now();
            const res = runTopologicalSort(nodes, edges);
            execTime = parseFloat((performance.now() - t0).toFixed(3));
            resultStr = res.hasCycle
              ? 'Cycle detected — DAG ordering not possible'
              : `Order: ${res.order.join(' → ')}`;
          } else if (meta.key === 'segment_tree') {
            const densities = nodes.map(n => Math.round(n.currentDensity));
            const bench = SegmentTree.benchmark(densities, 0, nodes.length - 1);
            execTime = bench.executionTime;
            resultStr = `Range sum query [0,${nodes.length - 1}] = ${bench.result} people`;
          }
        } catch {
          resultStr = 'Error during execution';
        }

        return { ...meta, execTime, result: resultStr };
      });

      setAlgorithms(updated);
      setIsRunning(false);
      setBenchmarkRan(true);
    }, 100);
  };

  // Auto-run on mount
  useEffect(() => {
    if (nodes.length > 0 && !benchmarkRan) {
      runBenchmarks();
    }
  }, [nodes]);

  const totalExecTime = algorithms.reduce((sum, a) => sum + (a.execTime || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-8 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            DAA Algorithm Insights
          </h2>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Live performance benchmarks of all algorithms running on the active venue graph.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Total time badge */}
          {benchmarkRan && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
              <span>Total: <span className="text-brand-green font-bold">{totalExecTime.toFixed(3)} ms</span></span>
            </div>
          )}

          <button
            onClick={runBenchmarks}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 disabled:bg-brand-blue/40 text-white text-sm font-bold rounded-xl shadow-glow-blue transition-all"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Re-run Benchmarks'}
          </button>
        </div>
      </div>

      {/* Complexity Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {algorithms.map((algo, idx) => (
          <motion.div
            key={algo.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <GlassCard glowColor={algo.glowColor} className="h-full flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`text-[9px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-md border ${algo.color}`}>
                    {algo.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2 font-sans">{algo.name}</h3>
                </div>
                <div className={`p-2.5 rounded-xl border ${algo.color}`}>
                  <Cpu className="w-4 h-4" />
                </div>
              </div>

              {/* Purpose */}
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans flex-1">
                {algo.purpose}
              </p>

              {/* Complexity table */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Time</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-200">{algo.timeComplexity}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MemoryStick className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Space</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-200">{algo.spaceComplexity}</span>
                </div>
              </div>

              {/* Live benchmark result */}
              <div className={`p-3 rounded-xl border border-slate-900/60 bg-slate-950/40 space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-brand-blue" />
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Live Execution</span>
                  </div>
                  {algo.execTime !== null ? (
                    <span className={`text-xs font-bold font-mono ${algo.execTime < 1 ? 'text-brand-green' : algo.execTime < 5 ? 'text-amber-400' : 'text-brand-red'}`}>
                      {algo.execTime < 0.001 ? '<0.001' : algo.execTime.toFixed(3)} ms
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-slate-600 animate-pulse">—</span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed break-words">
                  {algo.result}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Summary Performance Table */}
      {benchmarkRan && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-blue" />
              Benchmark Performance Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 text-left">
                    <th className="pb-3 pr-6">Algorithm</th>
                    <th className="pb-3 pr-6">Category</th>
                    <th className="pb-3 pr-6">Time Complexity</th>
                    <th className="pb-3 pr-6">Space Complexity</th>
                    <th className="pb-3 text-right">Exec Time (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {algorithms.map((algo, i) => (
                    <tr key={algo.key} className={`border-b border-slate-900/50 ${i % 2 === 0 ? 'bg-slate-950/20' : ''}`}>
                      <td className="py-3 pr-6 font-bold text-slate-200">{algo.name}</td>
                      <td className="py-3 pr-6 text-slate-500">{algo.category}</td>
                      <td className="py-3 pr-6 text-slate-350">{algo.timeComplexity}</td>
                      <td className="py-3 pr-6 text-slate-350">{algo.spaceComplexity}</td>
                      <td className={`py-3 text-right font-bold ${
                        algo.execTime === null ? 'text-slate-600' :
                        algo.execTime < 1 ? 'text-brand-green' :
                        algo.execTime < 5 ? 'text-amber-400' : 'text-brand-red'
                      }`}>
                        {algo.execTime === null ? '—' : algo.execTime < 0.001 ? '<0.001' : algo.execTime.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
};
