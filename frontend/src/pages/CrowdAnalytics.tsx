import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import {
  BarChart3,
  TrendingUp,
  Users,
  Compass,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  GitFork,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { findSafestPathAStar, computeMaxFlow } from '../utils/algorithms';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface HistoryPoint {
  time: string;
  totalCrowd: number;
  congestedAreas: number;
  riskScore: number;
  stampedeProbability: number;
  avgDensityPct: number;
}

export const CrowdAnalytics: React.FC = () => {
  const { stats, nodes, edges, isRunning } = useSimulation();

  // ── History tracking ─────────────────────────────────────────
  const historyRef = useRef<HistoryPoint[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    if (!isRunning) return;
    const point: HistoryPoint = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      totalCrowd: stats.totalCrowd,
      congestedAreas: stats.congestedAreas,
      riskScore: stats.riskScore,
      stampedeProbability: stats.stampedeProbability,
      avgDensityPct: Math.round(stats.avgDensityRatio * 100),
    };
    historyRef.current = [...historyRef.current.slice(-29), point];
    setHistory([...historyRef.current]);
  }, [stats.totalCrowd, stats.riskScore, isRunning]);

  // ── Derived live data ────────────────────────────────────────
  const sortedByDensity = [...nodes]
    .filter(n => n.type !== 'EMERGENCY_EXIT')
    .sort((a, b) => (b.currentDensity / b.capacity) - (a.currentDensity / a.capacity));

  const zoneDensityData = sortedByDensity.map(n => ({
    name: n.name.length > 14 ? n.name.substring(0, 14) + '…' : n.name,
    fullName: n.name,
    density: Math.round(n.currentDensity),
    capacity: n.capacity,
    pct: Math.round((n.currentDensity / n.capacity) * 100),
    type: n.type,
  }));

  const topEdges = [...edges]
    .map(e => {
      const src = nodes.find(n => n.id === e.source);
      const tgt = nodes.find(n => n.id === e.target);
      return {
        name: `${src?.name?.split(' ')[0] ?? e.source} → ${tgt?.name?.split(' ')[0] ?? e.target}`,
        flow: e.currentFlow,
        capacity: e.capacity,
        utilPct: Math.round((e.currentFlow / e.capacity) * 100),
      };
    })
    .sort((a, b) => b.utilPct - a.utilPct)
    .slice(0, 10);

  // Exit node load
  const exitNodes = nodes.filter(n => n.type === 'EMERGENCY_EXIT');
  const gateNodes = nodes.filter(n => n.type === 'ENTRY_GATE');
  const exitData = [...exitNodes, ...gateNodes].map(n => ({
    name: n.name,
    value: Math.round(n.currentDensity),
  }));

  // Radar data — per-type summary
  const typeGroups: Record<string, { total: number; cap: number; count: number }> = {};
  nodes.forEach(n => {
    if (!typeGroups[n.type]) typeGroups[n.type] = { total: 0, cap: 0, count: 0 };
    typeGroups[n.type].total += n.currentDensity;
    typeGroups[n.type].cap += n.capacity;
    typeGroups[n.type].count += 1;
  });
  const radarData = Object.entries(typeGroups).map(([type, g]) => ({
    type: type.replace(/_/g, ' '),
    load: Math.round((g.total / g.cap) * 100),
    count: g.count,
  }));

  // Algorithm comparison — run A* vs Max Flow live
  const [algoComparison, setAlgoComparison] = useState<{ name: string; time: number; result: string; complexity: string }[]>([]);
  useEffect(() => {
    const gate = gateNodes[0];
    const exit = exitNodes[0];
    if (!gate || !exit) return;

    const t0 = performance.now();
    const astarRes = findSafestPathAStar(nodes, edges, gate.id, exit.id);
    const t1 = performance.now();

    const t2 = performance.now();
    const mfRes = computeMaxFlow(nodes, edges, gateNodes.map(g => g.id), exitNodes.map(e => e.id));
    const t3 = performance.now();

    setAlgoComparison([
      { name: 'A* Pathfinder', time: +(t1 - t0).toFixed(2), result: `${astarRes.path.length} hops, cost ${Math.round(astarRes.totalCost)}`, complexity: 'O(E log V)' },
      { name: 'Edmonds-Karp Max Flow', time: +(t3 - t2).toFixed(2), result: `${mfRes.maxFlow} people/sec`, complexity: 'O(V·E²)' },
    ]);
  }, [stats.totalCrowd]);

  // KPI trend arrows
  const prevCrowd = history.length >= 2 ? history[history.length - 2].totalCrowd : stats.totalCrowd;
  const crowdDelta = stats.totalCrowd - prevCrowd;
  const prevRisk = history.length >= 2 ? history[history.length - 2].riskScore : stats.riskScore;
  const riskDelta = stats.riskScore - prevRisk;

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const cardVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="space-y-8 p-8 max-w-[1440px] mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Crowd Flow & Analytics
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Live simulation metrics, zone density breakdown, edge utilization, and algorithmic performance.
        </p>
      </div>

      {/* ── KPI STRIP ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Total Crowd',
            value: stats.totalCrowd.toLocaleString(),
            icon: Users,
            color: 'text-brand-blue',
            bg: 'bg-brand-blue/10',
            delta: crowdDelta,
          },
          {
            label: 'Congested Zones',
            value: stats.congestedAreas.toString(),
            icon: AlertTriangle,
            color: stats.congestedAreas > 0 ? 'text-brand-orange' : 'text-brand-green',
            bg: stats.congestedAreas > 0 ? 'bg-brand-orange/10' : 'bg-brand-green/10',
          },
          {
            label: 'Risk Score',
            value: `${stats.riskScore}%`,
            icon: ShieldCheck,
            color: stats.riskScore >= 70 ? 'text-brand-red' : stats.riskScore >= 40 ? 'text-brand-orange' : 'text-brand-green',
            bg: stats.riskScore >= 70 ? 'bg-brand-red/10' : stats.riskScore >= 40 ? 'bg-brand-orange/10' : 'bg-brand-green/10',
            delta: riskDelta,
          },
          {
            label: 'Stampede Prob.',
            value: `${stats.stampedeProbability}%`,
            icon: Zap,
            color: stats.stampedeProbability >= 50 ? 'text-brand-red' : 'text-brand-green',
            bg: stats.stampedeProbability >= 50 ? 'bg-brand-red/10' : 'bg-brand-green/10',
          },
          {
            label: 'Avg Load',
            value: `${Math.round(stats.avgDensityRatio * 100)}%`,
            icon: Activity,
            color: 'text-violet-400',
            bg: 'bg-violet-400/10',
          },
          {
            label: 'Bottlenecks',
            value: stats.bottleneckCount.toString(),
            icon: GitFork,
            color: stats.bottleneckCount > 0 ? 'text-brand-red' : 'text-brand-green',
            bg: stats.bottleneckCount > 0 ? 'bg-brand-red/10' : 'bg-brand-green/10',
          },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={cardVariants}>
            <GlassCard glowColor="none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-2xl font-bold text-white tracking-tight">{kpi.value}</span>
                {kpi.delta !== undefined && kpi.delta !== 0 && (
                  <span className={`flex items-center text-[10px] font-mono font-bold ${kpi.delta > 0 ? 'text-brand-red' : 'text-brand-green'}`}>
                    {kpi.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.delta)}
                  </span>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ── ROW 1: Historical Trends ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Crowd Over Time */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Users className="w-4 h-4 mr-2 text-brand-blue" />
              <span>Live Crowd Trend</span>
              <span className="ml-auto text-[9px] text-slate-600 font-normal">Last {history.length} ticks</span>
            </h3>
            <div className="h-56 w-full">
              {history.length < 2 ? (
                <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
                  <Clock className="w-4 h-4 mr-2" /> Waiting for simulation data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }} />
                    <Area type="monotone" dataKey="totalCrowd" name="Total Crowd" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#crowdGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Risk Score Over Time */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-brand-orange" />
              <span>Risk & Stampede Probability Trend</span>
            </h3>
            <div className="h-56 w-full">
              {history.length < 2 ? (
                <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
                  <Clock className="w-4 h-4 mr-2" /> Waiting for simulation data…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="riskScore" name="Risk Score (%)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="stampedeProbability" name="Stampede Prob. (%)" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── ROW 2: Zone Density + Edge Utilization ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Density Bar Chart */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Layers className="w-4 h-4 mr-2 text-violet-400" />
              <span>Zone Density Breakdown (Live)</span>
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneDensityData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#475569" fontSize={8} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }}
                  />
                  <Bar dataKey="capacity" name="Capacity" fill="#1e293b" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  <Bar dataKey="density" name="Current Density" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {zoneDensityData.map((entry, idx) => {
                      let fill = '#10B981';
                      if (entry.pct >= 90) fill = '#EF4444';
                      else if (entry.pct >= 70) fill = '#F97316';
                      else if (entry.pct >= 50) fill = '#F59E0B';
                      return <Cell key={idx} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Top Edge Utilization */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <GitFork className="w-4 h-4 mr-2 text-cyan-400" />
              <span>Top 10 Edge Utilization (Live)</span>
            </h3>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {topEdges.map((e, i) => {
                let barColor = 'bg-brand-green';
                if (e.utilPct >= 90) barColor = 'bg-brand-red';
                else if (e.utilPct >= 70) barColor = 'bg-brand-orange';
                else if (e.utilPct >= 50) barColor = 'bg-amber-400';
                return (
                  <div key={i} className="flex items-center space-x-3 p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-mono text-slate-300 truncate">{e.name}</span>
                        <span className={`text-[10px] font-mono font-bold ${e.utilPct >= 90 ? 'text-brand-red' : e.utilPct >= 70 ? 'text-brand-orange' : 'text-slate-400'}`}>
                          {e.flow}/{e.capacity} ({e.utilPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1 border border-slate-800">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, e.utilPct)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── ROW 3: Exit Load + Zone Type Radar ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exit Utilization Donut */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-brand-green" />
              <span>Exit & Gate Load (Live)</span>
            </h3>
            <div className="h-64 w-full flex flex-col md:flex-row items-center justify-between">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {exitData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 font-mono text-[10px] w-full md:w-1/2">
                {exitData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between p-2 bg-slate-900/40 border border-slate-800/60 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-400 font-bold truncate">{entry.name}</span>
                    </div>
                    <span className="text-slate-300 font-bold">{entry.value} people</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Zone Type Radar */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Activity className="w-4 h-4 mr-2 text-pink-400" />
              <span>Zone Type Load Radar (Live)</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="type" stroke="#64748b" fontSize={9} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#334155" fontSize={8} />
                  <Radar name="Load %" dataKey="load" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.25} isAnimationActive={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── ROW 4: Algorithm Perf + Node Table ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Algorithm Performance */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Compass className="w-4 h-4 mr-2 text-brand-blue" />
              <span>Live Algorithm Performance</span>
            </h3>
            {algoComparison.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-600 text-xs font-mono">
                <Clock className="w-4 h-4 mr-2" /> Waiting for simulation…
              </div>
            ) : (
              <div className="space-y-3">
                {algoComparison.map(algo => (
                  <div key={algo.name} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-sans">{algo.name}</span>
                      <span className="text-[10px] font-mono text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-2 py-0.5 rounded-md">
                        {algo.complexity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Execution: <span className="text-brand-green font-bold">{algo.time} ms</span></span>
                      <span>Result: <span className="text-slate-200">{algo.result}</span></span>
                    </div>
                    {/* Execution time bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1 border border-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-blue transition-all duration-500"
                        style={{ width: `${Math.min(100, (algo.time / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/40">
                  <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                    <span className="text-slate-400 font-bold">Note:</span> Times are measured live on each simulation tick.
                    A* runs from <span className="text-brand-blue">Gate A</span> → <span className="text-brand-blue">Exit A</span>.
                    Max Flow uses Edmonds-Karp with virtual super-source/sink.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Full Node Status Table */}
        <motion.div variants={cardVariants}>
          <GlassCard glowColor="none" className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
              <Layers className="w-4 h-4 mr-2 text-emerald-400" />
              <span>All Zones Status (Live)</span>
              <span className="ml-auto text-[9px] text-slate-600 font-normal">{nodes.length} nodes</span>
            </h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="sticky top-0 bg-slate-950/95">
                  <tr className="text-slate-500 border-b border-slate-800/60">
                    <th className="text-left py-2 px-2 font-semibold">Zone</th>
                    <th className="text-left py-2 px-1 font-semibold">Type</th>
                    <th className="text-right py-2 px-1 font-semibold">Crowd</th>
                    <th className="text-right py-2 px-1 font-semibold">Cap</th>
                    <th className="text-right py-2 px-2 font-semibold">Load</th>
                    <th className="text-center py-2 px-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByDensity.map(node => {
                    const pct = Math.round((node.currentDensity / node.capacity) * 100);
                    let statusColor = 'text-brand-green';
                    let statusLabel = 'SAFE';
                    if (pct >= 90) { statusColor = 'text-brand-red'; statusLabel = 'CRITICAL'; }
                    else if (pct >= 70) { statusColor = 'text-brand-orange'; statusLabel = 'HIGH'; }
                    else if (pct >= 50) { statusColor = 'text-amber-400'; statusLabel = 'MODERATE'; }
                    return (
                      <tr key={node.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                        <td className="py-1.5 px-2 text-slate-300 truncate max-w-[120px]">{node.name}</td>
                        <td className="py-1.5 px-1 text-slate-500">{node.type.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 px-1 text-right text-slate-300">{Math.round(node.currentDensity)}</td>
                        <td className="py-1.5 px-1 text-right text-slate-500">{node.capacity}</td>
                        <td className="py-1.5 px-2 text-right">
                          <span className={`font-bold ${statusColor}`}>{pct}%</span>
                        </td>
                        <td className="py-1.5 px-1 text-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${
                            pct >= 90 ? 'text-brand-red bg-brand-red/10 border-brand-red/20' :
                            pct >= 70 ? 'text-brand-orange bg-brand-orange/10 border-brand-orange/20' :
                            pct >= 50 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                            'text-brand-green bg-brand-green/10 border-brand-green/20'
                          }`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── ROW 5: Avg Density Trend ────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <GlassCard glowColor="none" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <Activity className="w-4 h-4 mr-2 text-emerald-400" />
            <span>Average Venue Load & Congested Zones Over Time</span>
          </h3>
          <div className="h-52 w-full">
            {history.length < 2 ? (
              <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
                <Clock className="w-4 h-4 mr-2" /> Waiting for simulation data…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="avgDensityPct" name="Avg Load (%)" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#avgGrad)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="congestedAreas" name="Congested Zones" stroke="#EF4444" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </motion.div>

    </motion.div>
  );
};
