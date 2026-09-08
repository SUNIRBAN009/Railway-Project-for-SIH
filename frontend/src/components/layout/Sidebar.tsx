import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useUIStore } from '../../stores/uiStore';
import {
  LayoutDashboard,
  Wrench,
  Zap,
  Radio,
  Map,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navItems = [
    {
      to: '/coa',
      label: 'Control Room (COA)',
      shortLabel: 'COA',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      color: 'text-cyan-400 group-hover:text-cyan-300',
      activeColor: 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/50',
      description: 'Chief Operating Controller Terminal',
    },
    {
      to: '/eng',
      label: 'Civil Engineering (ENG)',
      shortLabel: 'ENG',
      icon: <Wrench className="w-5 h-5 shrink-0" />,
      color: 'text-blue-400 group-hover:text-blue-300',
      activeColor: 'bg-blue-950/60 border-blue-400 text-blue-300 shadow-sm shadow-blue-950/50',
      description: 'P-Way Track Maintenance & Tamping',
    },
    {
      to: '/trd',
      label: 'Traction Power (TRD)',
      shortLabel: 'TRD',
      icon: <Zap className="w-5 h-5 shrink-0" />,
      color: 'text-amber-400 group-hover:text-amber-300',
      activeColor: 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-sm shadow-amber-950/50',
      description: '25kV Catenary OHE Isolation',
    },
    {
      to: '/snt',
      label: 'Signal & Telecom (S&T)',
      shortLabel: 'S&T',
      icon: <Radio className="w-5 h-5 shrink-0" />,
      color: 'text-emerald-400 group-hover:text-emerald-300',
      activeColor: 'bg-emerald-950/60 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-950/50',
      description: 'Point Machines & Interlocking',
    },
    {
      to: '/map',
      label: '3D Corridor GIS Map',
      shortLabel: 'GIS',
      icon: <Map className="w-5 h-5 shrink-0" />,
      color: 'text-purple-400 group-hover:text-purple-300',
      activeColor: 'bg-purple-950/60 border-purple-400 text-purple-300 shadow-sm shadow-purple-950/50',
      description: 'Mapbox 60 FPS Vector Twin',
    },
  ];

  return (
    <aside
      className={`border-r border-control-border bg-control-panel flex flex-col justify-between transition-all duration-300 z-20 select-none ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top: Nav Menu */}
      <div className="p-3 space-y-4">
        {/* Collapse toggle row */}
        <div className="flex items-center justify-between px-2 py-1">
          {!sidebarCollapsed && (
            <span className="text-[11px] font-mono uppercase tracking-widest text-control-muted font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Navigation Menu
            </span>
          )}
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1 rounded-md text-control-muted hover:text-white hover:bg-control-border/50 transition ml-auto"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all group ${
                  isActive
                    ? `${item.activeColor} border font-bold`
                    : 'border-transparent text-slate-300 hover:bg-control-bg hover:border-control-border hover:text-white'
                }`
              }
            >
              <div className={item.color}>{item.icon}</div>
              {!sidebarCollapsed && (
                <div className="truncate text-left">
                  <p className="truncate font-mono leading-none">{item.label}</p>
                  <p className="text-[10px] text-control-muted truncate mt-1 font-sans">{item.description}</p>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Quick Demo Switcher Widget */}
        {!sidebarCollapsed && (
          <div className="mt-6 p-3 rounded-xl bg-control-bg/80 border border-control-border/80">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIH Demo Fast-Switch</span>
            </div>
            <p className="text-[11px] text-control-muted mb-2.5 leading-snug">
              Instant department preview for jury presentation:
            </p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <NavLink
                to="/coa"
                className="py-1 px-2 text-center rounded border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
              >
                COA Chief
              </NavLink>
              <NavLink
                to="/eng"
                className="py-1 px-2 text-center rounded border border-blue-500/30 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40"
              >
                ENG Track
              </NavLink>
              <NavLink
                to="/trd"
                className="py-1 px-2 text-center rounded border border-amber-500/30 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
              >
                TRD Power
              </NavLink>
              <NavLink
                to="/snt"
                className="py-1 px-2 text-center rounded border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40"
              >
                S&T Signals
              </NavLink>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: System Badge */}
      <div className="p-3 border-t border-control-border/60 bg-control-bg/60">
        {!sidebarCollapsed ? (
          <div className="text-[11px] font-mono text-control-muted space-y-1">
            <div className="flex items-center justify-between">
              <span>PLATFORM</span>
              <span className="text-cyan-400 font-bold">PS 26027</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CORE STACK</span>
              <span className="text-white">v2.3.1 SPA</span>
            </div>
          </div>
        ) : (
          <div className="w-full text-center font-mono text-[10px] text-cyan-400 font-bold">
            IR
          </div>
        )}
      </div>
    </aside>
  );
};
