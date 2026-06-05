import React, { useState, useEffect } from 'react';
import { Search, Bell, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const Header: React.FC = () => {
  const { stats, isEvacuationActive, activeAlgorithm, logs } = useSimulation();
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter logs for notification warnings/criticals
  const alertsCount = logs.filter(l => l.level !== 'INFO').length;

  return (
    <header className={`h-20 border-b flex items-center justify-between px-8 z-20 sticky top-0 bg-brand-bg/80 backdrop-blur-md transition-colors duration-500 ${
      isEvacuationActive ? 'border-brand-red/30 shadow-[0_4px_20px_rgba(239,68,68,0.05)]' : 'border-slate-800/60'
    }`}>
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search zones, exits, routes..."
            className="w-full bg-slate-900/60 text-sm rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 border border-slate-800/80 focus:outline-none focus:border-brand-blue/60 focus:ring-1 focus:ring-brand-blue/30 transition-all font-sans"
          />
        </div>

        {/* Active Algorithm Badge */}
        {activeAlgorithm ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/5 text-[11px] font-mono text-brand-blue animate-pulse">
            <Cpu className="w-3.5 h-3.5" />
            <span>Active Algorithm: {activeAlgorithm.name.split(' (')[0]}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-[11px] font-mono text-slate-500">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>Segment Tree Idle</span>
          </div>
        )}
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center space-x-6">
        {/* Real-time Clock */}
        <div className="flex flex-col text-right font-mono">
          <span className="text-xs uppercase tracking-wider text-slate-500">Telemetry Time</span>
          <span className="text-sm font-semibold text-slate-300">{time}</span>
        </div>

        {/* System Health */}
        <div className="flex flex-col text-right font-mono">
          <span className="text-xs uppercase tracking-wider text-slate-500">System Risk</span>
          <span className={`text-sm font-semibold flex items-center space-x-1 ${
            stats.riskScore >= 70 ? 'text-brand-red' : stats.riskScore >= 40 ? 'text-brand-orange' : 'text-brand-green'
          }`}>
            {stats.riskScore >= 70 ? (
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 animate-bounce" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            )}
            {stats.riskScore}%
          </span>
        </div>

        <div className="w-[1px] h-8 bg-slate-850"></div>

        {/* Notification Icon */}
        <div className="relative cursor-pointer hover:text-white text-slate-400 p-1.5 transition-colors rounded-lg hover:bg-slate-800/40">
          <Bell className="w-5 h-5" />
          {alertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-red text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
              {alertsCount}
            </span>
          )}
        </div>

        {/* User Dropdown */}
        <div className="flex items-center space-x-2.5 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-violet-600 flex items-center justify-center text-white font-mono font-bold text-xs">
            JD
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-300">John Doe</span>
            <span className="text-[10px] text-slate-500 font-mono">Incident Cmdr</span>
          </div>
        </div>
      </div>
    </header>
  );
};
