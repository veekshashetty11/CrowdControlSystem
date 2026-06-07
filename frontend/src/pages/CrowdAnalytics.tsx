import React from 'react';
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
  Line 
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { BarChart3, TrendingUp, Users, Compass } from 'lucide-react';

// Mock Data for Analytics
const densityOverTime = [
  { time: '10:00', Gate_A: 120, Hall_1: 450, Corridor_1: 80, Exit_A: 10 },
  { time: '10:15', Gate_A: 180, Hall_1: 650, Corridor_1: 150, Exit_A: 40 },
  { time: '10:30', Gate_A: 250, Hall_1: 850, Corridor_1: 220, Exit_A: 90 },
  { time: '10:45', Gate_A: 310, Hall_1: 950, Corridor_1: 280, Exit_A: 140 },
  { time: '11:00', Gate_A: 240, Hall_1: 820, Corridor_1: 210, Exit_A: 310 },
  { time: '11:15', Gate_A: 140, Hall_1: 610, Corridor_1: 130, Exit_A: 520 },
];

const congestionTrends = [
  { cycle: 'Cycle 1', risk: 35 },
  { cycle: 'Cycle 2', risk: 42 },
  { cycle: 'Cycle 3', risk: 58 },
  { cycle: 'Cycle 4', risk: 78 },
  { cycle: 'Cycle 5', risk: 65 },
  { cycle: 'Cycle 6', risk: 48 },
];

const exitUtilization = [
  { name: 'Exit A (East)', value: 640 },
  { name: 'Exit B (West)', value: 480 },
  { name: 'Main Gate A', value: 120 },
  { name: 'Main Gate B', value: 80 },
];

const routeEfficiency = [
  { route: 'Route 1 (A*)', time: 45, risk: 20 },
  { route: 'Route 2 (BFS)', time: 65, risk: 50 },
  { route: 'Route 3 (Static)', time: 80, risk: 90 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export const CrowdAnalytics: React.FC = () => {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
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
          Crowd Flow & Analytics
        </h2>
        <p className="text-sm text-slate-500 font-mono mt-1">
          Historical charts, exit loading, and pathfinding routing metrics.
        </p>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Density Over Time */}
        <GlassCard glowColor="none" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <Users className="w-4.5 h-4.5 mr-2 text-brand-blue" />
            <span>Zone Density Timeline (m²)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={densityOverTime}>
                <defs>
                  <linearGradient id="colorGate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} labelClassName="text-slate-400 font-mono text-xs" />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="Gate_A" stroke="#3B82F6" fillOpacity={1} fill="url(#colorGate)" isAnimationActive={false} />
                <Area type="monotone" dataKey="Hall_1" stroke="#EF4444" fillOpacity={1} fill="url(#colorHall)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* 2. Congestion Trends */}
        <GlassCard glowColor="none" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <TrendingUp className="w-4.5 h-4.5 mr-2 text-brand-orange" />
            <span>Congestion Risk Level Trends (%)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={congestionTrends}>
                <XAxis dataKey="cycle" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} labelClassName="text-slate-400 font-mono text-xs" />
                <Line type="monotone" dataKey="risk" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* 3. Exit Utilization */}
        <GlassCard glowColor="none" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <BarChart3 className="w-4.5 h-4.5 mr-2 text-brand-green" />
            <span>Emergency exit utilization (load)</span>
          </h3>
          <div className="h-64 w-full flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={exitUtilization}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {exitUtilization.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 font-mono text-[10px] w-full md:w-1/2">
              {exitUtilization.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="text-slate-400 font-bold">{entry.name}</span>
                  </div>
                  <span className="text-slate-250 font-bold">{entry.value} people</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* 4. Route Efficiency */}
        <GlassCard glowColor="none" className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center">
            <Compass className="w-4.5 h-4.5 mr-2 text-brand-blue" />
            <span>Pathfinder Algorithmic Efficiency</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeEfficiency}>
                <XAxis dataKey="route" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Bar dataKey="time" name="Traversal Time (s)" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="risk" name="Avg Congestion Risk (%)" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
};
