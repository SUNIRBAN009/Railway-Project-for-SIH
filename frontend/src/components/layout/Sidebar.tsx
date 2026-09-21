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
  Database,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const getNavItems = () => {
    if (!user) return [];

    // 1. Civil Engineering Department (ENG)
    if (user.department_code === 'ENG') {
      return [
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
          to: '/map',
          label: '3D Corridor GIS Map',
          shortLabel: 'GIS',
          icon: <Map className="w-5 h-5 shrink-0" />,
          color: 'text-purple-400 group-hover:text-purple-300',
          activeColor: 'bg-purple-950/60 border-purple-400 text-purple-300 shadow-sm shadow-purple-950/50',
          description: 'Mapbox 60 FPS Vector Twin',
        },
      ];
    }

    // 2. Traction Power Department (TRD)
    if (user.department_code === 'TRD') {
      return [
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
          to: '/map',
          label: '3D Corridor GIS Map',
          shortLabel: 'GIS',
          icon: <Map className="w-5 h-5 shrink-0" />,
          color: 'text-purple-400 group-hover:text-purple-300',
          activeColor: 'bg-purple-950/60 border-purple-400 text-purple-300 shadow-sm shadow-purple-950/50',
          description: 'Mapbox 60 FPS Vector Twin',
        },
      ];
    }

    // 3. Signal & Telecom Department (S&T)
    if (user.department_code === 'SNT') {
      return [
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
    }

    // 4. Operating Control Office (COA / Section Controller)
    if (user.role === 'CHIEF_CONTROLLER' || user.role === 'SECTION_CONTROLLER' || user.department_code === 'OPERATIONS') {
      return [
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
          to: '/map',
          label: '3D Corridor GIS Map',
          shortLabel: 'GIS',
          icon: <Map className="w-5 h-5 shrink-0" />,
          color: 'text-purple-400 group-hover:text-purple-300',
          activeColor: 'bg-purple-950/60 border-purple-400 text-purple-300 shadow-sm shadow-purple-950/50',
          description: 'Mapbox 60 FPS Vector Twin',
        },
        {
          to: '/master-data',
          label: 'Master Data & GeoJSON',
          shortLabel: 'DATA',
          icon: <Database className="w-5 h-5 shrink-0" />,
          color: 'text-cyan-400 group-hover:text-cyan-300',
          activeColor: 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/50',
          description: 'Ground-Truth Inspector & RFC 7946',
        },
      ];
    }

    // 5. System Administrator (Full root clearance)
    return [
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
      {
        to: '/master-data',
        label: 'Master Data & GeoJSON',
        shortLabel: 'DATA',
        icon: <Database className="w-5 h-5 shrink-0" />,
        color: 'text-cyan-400 group-hover:text-cyan-300',
        activeColor: 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950/50',
        description: 'Ground-Truth Inspector & RFC 7946',
      },
    ];
  };

  const navItems = getNavItems();

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

        {/* Department Clearance Badge */}
        {!sidebarCollapsed && user && (
          <div className="mt-6 p-3 rounded-xl bg-control-bg/80 border border-control-border/80">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Terminal Clearance</span>
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-white font-bold truncate">{user.username}</div>
              <div className="text-cyan-400 text-[10px] uppercase font-bold">{user.role}</div>
              <div className="text-control-muted text-[10px]">{user.department_code} Department</div>
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
