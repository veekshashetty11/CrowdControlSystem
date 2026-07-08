import React, { useState, useEffect, useRef } from 'react';
import { Bell, Cpu, AlertTriangle, ShieldCheck, X, Flame, Info, ChevronDown } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const Header: React.FC = () => {
  const { stats, isEvacuationActive, activeAlgorithm, logs } = useSimulation();
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedCount, setDismissedCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter logs for notification-worthy items (warnings + critical)
  const alertLogs = logs.filter(l => l.level !== 'INFO');
  const unseenCount = Math.max(0, alertLogs.length - dismissedCount);

  const handleBellClick = () => {
    setShowNotifications(prev => !prev);
  };

  const handleMarkAllRead = () => {
    setDismissedCount(alertLogs.length);
  };

  const getNotifIcon = (level: string) => {
    if (level === 'CRITICAL') return <Flame className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />;
    if (level === 'WARNING') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
    return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;
  };

  const getNotifBorder = (level: string) => {
    if (level === 'CRITICAL') return 'border-l-red-500/60';
    if (level === 'WARNING') return 'border-l-amber-400/60';
    return 'border-l-blue-400/40';
  };

  return (
    <header className={`h-16 border-b flex items-center justify-between px-8 z-20 sticky top-0 bg-brand-bg/90 backdrop-blur-lg transition-colors duration-500 ${
      isEvacuationActive ? 'border-red-500/25' : 'border-slate-800/50'
    }`}>
      <div className="flex items-center space-x-4">

        {/* Active Algorithm Badge */}
        {activeAlgorithm ? (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-brand-blue/25 bg-brand-blue/5 text-[11px] font-mono text-brand-blue">
            <Cpu className="w-3.5 h-3.5" />
            <span>{activeAlgorithm.name.split(' (')[0]}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse ml-1" />
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-500">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>Idle</span>
          </div>
        )}
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center space-x-5">
        {/* Real-time Clock */}
        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Live</span>
          <span className="text-sm font-semibold text-slate-300 font-mono tabular-nums">{time}</span>
        </div>

        {/* System Health */}
        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Risk</span>
          <span className={`text-sm font-semibold flex items-center justify-end space-x-1 ${
            stats.riskScore >= 70 ? 'text-red-400' : stats.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {stats.riskScore >= 70 ? (
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            )}
            {stats.riskScore}%
          </span>
        </div>

        <div className="w-px h-8 bg-slate-800/60" />

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className={`relative p-2 rounded-lg transition-all duration-200 ${
              showNotifications
                ? 'bg-slate-800/60 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Bell className="w-5 h-5" />
            {unseenCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
                {unseenCount > 99 ? '99+' : unseenCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 max-h-[480px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-slate-200">Notifications</span>
                  {unseenCount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md">
                      {unseenCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {unseenCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification Items */}
              <div className="overflow-y-auto max-h-[400px]">
                {alertLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <Bell className="w-8 h-8 mb-3 text-slate-700" />
                    <p className="text-xs font-mono">No alerts yet</p>
                    <p className="text-[10px] font-mono text-slate-700 mt-1">System is operating normally</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/40">
                    {[...alertLogs].reverse().slice(0, 50).map((log, idx) => {
                      const isUnseen = idx < unseenCount;
                      return (
                        <div
                          key={log.id + idx}
                          className={`px-4 py-3 flex items-start space-x-3 border-l-2 transition-colors ${getNotifBorder(log.level)} ${
                            isUnseen ? 'bg-slate-800/20' : 'bg-transparent'
                          } hover:bg-slate-800/30`}
                        >
                          {getNotifIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-0.5">
                              <span className={`text-[10px] font-mono font-bold ${
                                log.level === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                              }`}>
                                {log.level}
                              </span>
                              <span className="text-[9px] font-mono text-slate-600">{log.timestamp}</span>
                              {isUnseen && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{log.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {alertLogs.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-800/60 text-center">
                  <span className="text-[10px] font-mono text-slate-600">
                    Showing latest {Math.min(50, alertLogs.length)} of {alertLogs.length} alerts
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-2.5 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs">
            VC
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-slate-300">Venue Control</span>
            <span className="text-[10px] text-slate-500 font-mono">Operator</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
        </div>
      </div>
    </header>
  );
};
