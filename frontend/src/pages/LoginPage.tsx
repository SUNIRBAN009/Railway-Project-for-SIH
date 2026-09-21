import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/api';
import { UserRole, DepartmentCode, User } from '../types';
import { getDestinationRoute } from '../utils/routeHelpers';
import {
  ShieldCheck,
  Train,
  KeyRound,
  User as UserIcon,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DemoPreset {
  number: string;
  label: string;
  role: UserRole;
  department: DepartmentCode;
  departmentName: string;
  username: string;
  badgeColor: string;
  targetRoute: string;
  description: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    number: '1',
    label: 'Chief Controller (COA)',
    role: 'CHIEF_CONTROLLER',
    department: 'OPERATIONS',
    departmentName: 'Operating & Traffic Control',
    username: 'coa_delhi_chief',
    badgeColor: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50',
    targetRoute: '/coa',
    description: 'Master corridor console, sanction blocks, live traffic map',
  },
  {
    number: '2',
    label: 'P-Way Track Engineer (ENG)',
    role: 'DEPT_ENGINEER',
    department: 'ENG',
    departmentName: 'Civil Engineering (Track)',
    username: 'eng_track_pway',
    badgeColor: 'border-blue-500/50 text-blue-400 bg-blue-950/40 hover:bg-blue-900/50',
    targetRoute: '/eng',
    description: 'Track tamping block proposals, flaw reports, gang rosters',
  },
  {
    number: '3',
    label: 'Traction Power (TRD)',
    role: 'DEPT_ENGINEER',
    department: 'TRD',
    departmentName: 'Traction Distribution (25kV AC)',
    username: 'trd_ohe_power',
    badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-950/40 hover:bg-amber-900/50',
    targetRoute: '/trd',
    description: '25kV catenary maintenance, power cutoff permits',
  },
  {
    number: '4',
    label: 'Signal & Telecom (S&T)',
    role: 'DEPT_ENGINEER',
    department: 'SNT',
    departmentName: 'Signal & Telecommunication',
    username: 'snt_signal_telecom',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50',
    targetRoute: '/snt',
    description: 'Electronic interlocking, point machine overhaul',
  },
  {
    number: '5',
    label: 'Section Controller (DLI)',
    role: 'SECTION_CONTROLLER',
    department: 'OPERATIONS',
    departmentName: 'Delhi Control Division',
    username: 'sec_controller_dli',
    badgeColor: 'border-purple-500/50 text-purple-400 bg-purple-950/40 hover:bg-purple-900/50',
    targetRoute: '/coa',
    description: 'Section timetable supervision and line clearance',
  },
  {
    number: '6',
    label: 'Lead Administrator',
    role: 'ADMIN',
    department: 'OPERATIONS',
    departmentName: 'System Administration',
    username: 'admin',
    badgeColor: 'border-rose-500/50 text-rose-400 bg-rose-950/40 hover:bg-rose-900/50',
    targetRoute: '/coa',
    description: 'Full root clearance, master data & corridor rules',
  },
  {
    number: '7',
    label: 'Senior Section Engineer (ENG SSE)',
    role: 'DEPT_ENGINEER',
    department: 'ENG',
    departmentName: 'Civil Engineering (Aligarh Section)',
    username: 'eng_sse',
    badgeColor: 'border-indigo-500/50 text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/50',
    targetRoute: '/eng',
    description: 'Track renewal, deep screening & turnout maintenance',
  },
  {
    number: '8',
    label: 'Site Supervisor (Gang 01 Leader)',
    role: 'SITE_SUPERVISOR',
    department: 'ENG',
    departmentName: 'Track Gang #01 (NDLS-GZB)',
    username: 'site_supervisor_gang01',
    badgeColor: 'border-teal-500/50 text-teal-400 bg-teal-950/40 hover:bg-teal-900/50',
    targetRoute: '/eng',
    description: 'Ground safety protocol, site token & headcount clearance',
  },
];

export { getDestinationRoute };

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getTargetRouteForUser = (user: User): string => {
    if (user.role === 'ADMIN') return '/coa';
    if (user.department_code === 'ENG') return '/eng';
    if (user.department_code === 'TRD') return '/trd';
    if (user.department_code === 'SNT') return '/snt';
    if (user.role === 'CHIEF_CONTROLLER' || user.role === 'SECTION_CONTROLLER' || user.department_code === 'OPERATIONS') return '/coa';
    return '/coa';
  };

  // Instant 1-Click Persona Login
  const handleDirectPersonaLogin = async (preset: DemoPreset) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Call Backend Login API
      const response = await authService.login(preset.username, '9999');
      if (response && response.data) {
        setAuth(response.data.user, response.data.access_token, response.data.refresh_token);
        const route = getTargetRouteForUser(response.data.user);
        navigate(route, { replace: true });
        return;
      }
    } catch {
      // 2. Direct Fallback if network or backend delay occurs
      const mockUser: User = {
        id: String(parseInt(preset.number) || 1),
        employee_id: `IR-SIH-${preset.number.padStart(4, '0')}`,
        username: preset.username,
        first_name: preset.label.split(' ')[0] || 'User',
        last_name: preset.label.split(' ')[1] || 'Demo',
        email: `${preset.username}@railway.gov.in`,
        role: preset.role,
        department_code: preset.department,
        division_code: 'DLI',
      };
      setAuth(mockUser, `mock-demo-token-${preset.username}`);
      navigate(preset.targetRoute, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const inputUser = username.trim();
    if (!inputUser) {
      setErrorMessage('Please enter an Operator ID, Username, or select a department persona below.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.login(inputUser, password || '9999');

      if (response && response.data) {
        const { user, access_token, refresh_token } = response.data;
        setAuth(user, access_token, refresh_token);

        const targetRoute = getTargetRouteForUser(user);
        navigate(targetRoute, { replace: true });
      } else {
        setErrorMessage('Authentication rejected. Please click any 1-click persona below.');
      }
    } catch (err: unknown) {
      // Fallback: match by number or default
      const preset =
        DEMO_PRESETS.find((p) => p.number === inputUser || p.username.toLowerCase() === inputUser.toLowerCase()) ||
        DEMO_PRESETS[0];

      const mockUser: User = {
        id: String(parseInt(preset.number) || 1),
        employee_id: `IR-SIH-${preset.number.padStart(4, '0')}`,
        username: preset.username,
        first_name: preset.label.split(' ')[0] || 'User',
        last_name: preset.label.split(' ')[1] || 'Demo',
        email: `${preset.username}@railway.gov.in`,
        role: preset.role,
        department_code: preset.department,
        division_code: 'DLI',
      };
      setAuth(mockUser, `mock-demo-token-${preset.username}`);

      const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(fromPath && fromPath !== '/' ? fromPath : preset.targetRoute, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-control-bg flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* BRANDING HEADER */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <Train className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight font-mono">
          RailBlock AI <span className="text-cyan-400 text-sm font-sans font-medium px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30">SIH PS 26027</span>
        </h1>
        <p className="mt-1 text-xs text-control-muted font-sans max-w-sm mx-auto">
          Automatic Block Planning & Multi-Departmental Track Availability Optimization System
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-control-panel border border-control-border py-6 px-6 sm:px-8 shadow-2xl rounded-2xl">
          {/* 1-CLICK INSTANT PERSONA ACCESS */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs uppercase font-mono font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>1-Click Instant Login (No Password Required)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/40">
                Password Bypass Active
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans mb-3">
              Click any operational persona to immediately authorize and jump straight into their live dashboard:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDirectPersonaLogin(p)}
                  className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between group ${p.badgeColor} shadow-md`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                        {p.number}
                      </span>
                      <p className="font-bold text-xs text-white group-hover:text-cyan-300 transition">
                        {p.label}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-300 truncate">{p.description}</p>
                  </div>
                  <div className="shrink-0 p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 text-white transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-control-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-control-panel px-3 font-mono text-control-muted text-[11px]">
                Or enter any User ID (1 to 100)
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Manual Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs uppercase font-mono text-control-muted mb-1"
                >
                  Operator ID (e.g. 1, 2, 3... or Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-control-muted">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-control-bg border border-control-border rounded-xl text-xs text-white font-mono placeholder-control-muted focus:outline-none focus:border-cyan-400"
                    placeholder="Enter 1 to 100 or username"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs uppercase font-mono text-control-muted mb-1 flex items-center justify-between"
                >
                  <span>Password</span>
                  <span className="text-[10px] text-emerald-400 lowercase font-mono">(optional: 9999)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-control-muted">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-control-bg border border-control-border rounded-xl text-xs text-white font-mono placeholder-control-muted focus:outline-none focus:border-cyan-400"
                    placeholder="Leave empty or enter 9999"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-control-muted hover:text-cyan-400 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white text-xs font-mono shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authorizing Operational Session...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Access {username ? `(${username})` : ''}</span>
                </div>
              )}
            </button>
          </form>

          {/* Quick Numerical Shortcut Pills */}
          <div className="mt-4 pt-4 border-t border-control-border flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono text-control-muted">
            <span className="text-slate-400">Quick IDs:</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setUsername('1')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-cyan-400 font-bold"
              >
                1: COA
              </button>
              <button
                type="button"
                onClick={() => setUsername('2')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-blue-400 font-bold"
              >
                2: ENG
              </button>
              <button
                type="button"
                onClick={() => setUsername('3')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-amber-400 font-bold"
              >
                3: TRD
              </button>
              <button
                type="button"
                onClick={() => setUsername('4')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-emerald-400 font-bold"
              >
                4: SNT
              </button>
              <button
                type="button"
                onClick={() => setUsername('5')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-purple-400 font-bold"
              >
                5: SEC
              </button>
              <button
                type="button"
                onClick={() => setUsername('6')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-rose-400 font-bold"
              >
                6: ADMIN
              </button>
              <button
                type="button"
                onClick={() => setUsername('7')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-indigo-400 font-bold"
              >
                7: SSE
              </button>
              <button
                type="button"
                onClick={() => setUsername('8')}
                className="px-2 py-0.5 bg-control-bg hover:bg-white/10 rounded border border-control-border text-teal-400 font-bold"
              >
                8: GANG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
