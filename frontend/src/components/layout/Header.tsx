import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useUIStore } from '../../stores/uiStore';
import { useSocketStore } from '../../stores/socketStore';
import { NotificationBell } from './NotificationBell';
import { AudioChime } from '../common/AudioChime';
import {
  Clock,
  Radio,
  Sun,
  Moon,
  LogOut,
  User,
  Shield,
  Train,
  Menu,
} from 'lucide-react';
import { format } from 'date-fns';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'CHIEF_CONTROLLER':
        return 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300';
      case 'SECTION_CONTROLLER':
        return 'bg-purple-950/70 border-purple-500/50 text-purple-300';
      case 'DEPT_ENGINEER':
        return 'bg-blue-950/70 border-blue-500/50 text-blue-300';
      case 'ADMIN':
        return 'bg-rose-950/70 border-rose-500/50 text-rose-300';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  const getDepartmentBadge = (dept?: string) => {
    switch (dept) {
      case 'ENG':
        return { label: 'ENG / P-Way', color: 'text-blue-400 border-blue-500/40 bg-blue-950/40' };
      case 'TRD':
        return { label: 'TRD / OHE', color: 'text-amber-400 border-amber-500/40 bg-amber-950/40' };
      case 'SNT':
        return { label: 'S&T / Signals', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' };
      case 'OPERATIONS':
      default:
        return { label: 'OPERATING (COA)', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' };
    }
  };

  const deptBadge = getDepartmentBadge(user?.department_code);

  const socketStatus = useSocketStore((state) => state.status);
  const socketLatency = useSocketStore((state) => state.latency);
  const reconnectAttempts = useSocketStore((state) => state.reconnectAttempts);

  return (
    <header className="border-b border-control-border bg-control-panel/90 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Left: Hamburger + Division Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          className="p-1.5 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-white hover:border-slate-600 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <Train className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-extrabold text-white tracking-wider">
                NR-DLI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                DELHI DIVISION
              </span>
            </div>
            <p className="text-[10px] font-mono text-cyan-400/90 tracking-tight hidden sm:block">
              NDLS–GZB–ALJN MAIN CORRIDOR
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Digital Clock (IST) & Daphne Telemetry */}
      <div className="hidden md:flex items-center space-x-4 bg-control-bg/80 border border-control-border px-3.5 py-1.5 rounded-xl shadow-inner">
        <div className="flex items-center space-x-1.5 text-xs font-mono text-cyan-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold tracking-widest">{format(currentTime, 'HH:mm:ss')}</span>
          <span className="text-[10px] text-control-muted">IST</span>
        </div>

        <div className="h-3 w-px bg-control-border" />

        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          {socketStatus === 'CONNECTED' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Radio className="w-3 h-3 text-emerald-400" />
              <span className="font-bold text-emerald-400">
                DAPHNE ASGI ONLINE <span className="text-emerald-300 font-normal">({socketLatency}ms)</span>
              </span>
            </>
          ) : socketStatus === 'RECONNECTING' || socketStatus === 'CONNECTING' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <Radio className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="font-bold text-amber-400">
                DAPHNE RECONNECTING {reconnectAttempts > 0 ? `(#${reconnectAttempts})` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <Radio className="w-3 h-3 text-rose-400" />
              <span className="font-bold text-rose-400">DAPHNE STANDBY</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions, Theme, Notifications & User Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Audio Chime Test & Mute Toggle */}
        <AudioChime showToggle={true} />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-white hover:border-slate-600 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Notifications Slide-over Bell */}
        <NotificationBell />

        <div className="h-6 w-px bg-control-border hidden sm:block" />

        {/* Operator Profile */}
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-xs font-bold text-white font-mono">{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold border ${deptBadge.color}`}>
                  {deptBadge.label}
                </span>
              </div>
              <div className="flex items-center justify-end space-x-1 text-[10px] font-mono text-control-muted">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>{user.employee_id || user.username}</span>
                <span>•</span>
                <span className={`px-1 py-0.2 rounded text-[9px] border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out / Disconnect Terminal"
              className="p-2 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-rose-400 hover:border-rose-500/50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-control-muted">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>
    </header>
  );
};
