import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/api';
import { UserRole, DepartmentCode } from '../types';
import { ShieldCheck, Train, KeyRound, User as UserIcon, AlertCircle, Sparkles } from 'lucide-react';

interface DemoPreset {
  label: string;
  role: string;
  department: string;
  username: string;
  badgeColor: string;
  targetRoute: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    label: 'Chief Controller (COA)',
    role: 'CHIEF_CONTROLLER',
    department: 'OPERATIONS',
    username: 'coa_delhi_chief',
    badgeColor: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/40',
    targetRoute: '/coa',
  },
  {
    label: 'P-Way / Track Engineer',
    role: 'DEPT_ENGINEER',
    department: 'ENG',
    username: 'eng_track_pway',
    badgeColor: 'border-blue-500/50 text-blue-400 bg-blue-950/40',
    targetRoute: '/eng',
  },
  {
    label: 'Traction Power (TRD)',
    role: 'DEPT_ENGINEER',
    department: 'TRD',
    username: 'trd_ohe_power',
    badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-950/40',
    targetRoute: '/trd',
  },
  {
    label: 'Signal & Telecom (S&T)',
    role: 'DEPT_ENGINEER',
    department: 'SNT',
    username: 'snt_signal_telecom',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40',
    targetRoute: '/snt',
  },
  {
    label: 'Section Controller',
    role: 'SECTION_CONTROLLER',
    department: 'OPERATIONS',
    username: 'sec_controller_dli',
    badgeColor: 'border-purple-500/50 text-purple-400 bg-purple-950/40',
    targetRoute: '/coa',
  },
  {
    label: 'Lead Administrator',
    role: 'ADMIN',
    department: 'OPERATIONS',
    username: 'admin',
    badgeColor: 'border-rose-500/50 text-rose-400 bg-rose-950/40',
    targetRoute: '/coa',
  },
];

export const getDestinationRoute = (role: UserRole, department: DepartmentCode): string => {
  switch (role) {
    case 'CHIEF_CONTROLLER':
    case 'SECTION_CONTROLLER':
    case 'ADMIN':
      return '/coa';
    case 'DEPT_ENGINEER':
    case 'SITE_SUPERVISOR':
      if (department === 'ENG') return '/eng';
      if (department === 'TRD') return '/trd';
      if (department === 'SNT') return '/snt';
      return '/coa';
    default:
      return '/coa';
  }
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('coa_delhi_chief');
  const [password, setPassword] = useState('Sunirban#2003');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectPreset = (preset: DemoPreset) => {
    setUsername(preset.username);
    setPassword('Sunirban#2003');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.login(username.trim(), password);

      if (response.success && response.data) {
        const { user, access_token } = response.data;
        setAuth(user, access_token);

        // Determine destination route based on role matrix or prior attempt
        const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
        const targetRoute = fromPath || getDestinationRoute(user.role, user.department_code);
        navigate(targetRoute, { replace: true });
      } else {
        setErrorMessage(response.message || 'Authentication rejected by security gateway.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const message =
        errorObj.response?.data?.message ||
        'Invalid operational credentials. Please verify username and demo password.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-control-bg text-control-text flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
          <Train className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Indian Railways AI Platform
        </h1>
        <p className="mt-2 text-sm text-cyan-400/80 font-mono tracking-wide">
          PS 26027 • AUTOMATIC BLOCK PLANNING & DISPATCH CONSOLE
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-control-panel border border-control-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {/* Preset Quick-Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono font-bold text-control-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Demo Credentials Presets
              </span>
              <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                PWD: Sunirban#2003
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-2 text-left rounded-lg border text-xs transition-all ${
                    username === p.username
                      ? `${p.badgeColor} ring-1 ring-cyan-400`
                      : 'border-control-border bg-control-bg/60 text-control-muted hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <p className="font-bold truncate">{p.label}</p>
                  <p className="font-mono text-[10px] opacity-75 truncate">{p.username}</p>
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-rose-950/50 border border-rose-500/50 flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-xs uppercase font-mono text-control-muted mb-1.5"
              >
                Operator Identification (User ID)
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
                  className="w-full pl-10 pr-3 py-2.5 bg-control-bg border border-control-border rounded-lg text-sm text-white font-mono placeholder-control-muted focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="e.g. coa_delhi_chief"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase font-mono text-control-muted mb-1.5"
              >
                Operational Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-control-muted">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-control-bg border border-control-border rounded-lg text-sm text-white font-mono placeholder-control-muted focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Authorize Terminal Access</span>
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-control-border text-center text-xs text-control-muted flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Security Standard: Argon2id Hashing & RS256/HMAC JWT Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};
