import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  BarChart3,
  Navigation, 
  ShieldAlert, 
  Play, 
  Settings, 
  Zap,
  GitFork,
  Brain
} from 'lucide-react';

export type TabId = 'dashboard' | 'live-map' | 'heatmap' | 'crowd-analytics' | 'route-optimizer' | 'max-flow' | 'daa-insights' | 'evacuation' | 'simulation' | 'settings';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isEvacuationActive: boolean;
}

interface SidebarItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isEvacuationActive }) => {
  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-map', label: 'Live Map', icon: Map },
    { id: 'heatmap', label: 'Crowd Heatmap', icon: Zap },
    { id: 'crowd-analytics', label: 'Crowd Analytics', icon: BarChart3 },
    { id: 'route-optimizer', label: 'Route Optimizer', icon: Navigation },
    { id: 'max-flow', label: 'Max Flow Visualizer', icon: GitFork },
    { id: 'daa-insights', label: 'DAA Insights', icon: Brain },
    { id: 'evacuation', label: 'Evacuation Center', icon: ShieldAlert },
    { id: 'simulation', label: 'Simulation Control', icon: Play },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`w-72 border-r transition-all duration-500 flex flex-col justify-between glass-panel z-30 h-screen sticky top-0 ${
      isEvacuationActive ? 'border-brand-red/30 shadow-[5px_0_20px_rgba(239,68,68,0.1)]' : 'border-slate-800/60'
    }`}>
      {/* Brand Header */}
      <div>
        <div className={`p-6 border-b flex items-center space-x-3 transition-colors ${
          isEvacuationActive ? 'border-brand-red/20' : 'border-slate-800/50'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isEvacuationActive 
              ? 'bg-brand-red/25 text-brand-red animate-pulse shadow-glow-red' 
              : 'bg-brand-blue/20 text-brand-blue shadow-glow-blue'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center">
              Evacu<span className={isEvacuationActive ? 'text-brand-red' : 'text-brand-blue'}>Graph</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              Venue Control System
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            let activeColorClass = 'text-brand-blue bg-brand-blue/10 border-brand-blue';
            if (isEvacuationActive) {
              activeColorClass = 'text-brand-red bg-brand-red/10 border-brand-red';
            } else if (item.id === 'evacuation') {
              activeColorClass = 'text-brand-red bg-brand-red/10 border-brand-red';
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-l-[3px] border-transparent ${
                  isActive 
                    ? activeColorClass 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 hover:border-slate-700/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="font-sans">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Health / Footer status */}
      <div className={`p-4 border-t flex flex-col space-y-2 transition-colors ${
        isEvacuationActive ? 'border-brand-red/20' : 'border-slate-800/50'
      }`}>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Engine Status</span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isEvacuationActive ? 'bg-brand-red animate-ping' : 'bg-brand-green animate-pulse'}`}></span>
            <span className={isEvacuationActive ? 'text-brand-red' : 'text-brand-green font-semibold'}>
              {isEvacuationActive ? 'EMERGENCY' : 'STABLE'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Core Version</span>
          <span>v2.4 (C++17 DAA)</span>
        </div>
      </div>
    </aside>
  );
};
