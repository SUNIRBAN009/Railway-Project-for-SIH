import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-control-bg flex items-center justify-center text-cyan-400 font-mono">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <span>Verifying Operational Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const [demoBypass, setDemoBypass] = React.useState(false);

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role) && !demoBypass) {
    return (
      <div className="min-h-screen bg-control-bg p-8 flex items-center justify-center font-sans">
        <div className="max-w-md w-full bg-control-panel border border-cyan-500/30 p-6 rounded-xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Operational Terminal Clearance</h2>
          <p className="text-sm text-control-muted mb-4">
            Logged in as <strong className="text-cyan-400">{user.username}</strong> ({user.role}).
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setDemoBypass(true)}
              className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-sm font-bold rounded-lg text-white transition shadow-lg shadow-cyan-600/30"
            >
              Unlock Console (Demo Mode)
            </button>
            <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
              <a
                href="/coa"
                className="p-2 rounded bg-control-bg border border-control-border hover:border-cyan-400 text-control-muted hover:text-white text-center"
              >
                Control Room (COA)
              </a>
              <a
                href="/eng"
                className="p-2 rounded bg-control-bg border border-control-border hover:border-blue-400 text-control-muted hover:text-white text-center"
              >
                Civil Eng (ENG)
              </a>
              <a
                href="/trd"
                className="p-2 rounded bg-control-bg border border-control-border hover:border-amber-400 text-control-muted hover:text-white text-center"
              >
                Traction (TRD)
              </a>
              <a
                href="/snt"
                className="p-2 rounded bg-control-bg border border-control-border hover:border-emerald-400 text-control-muted hover:text-white text-center"
              >
                Signal & Telecom
              </a>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }}
              className="w-full mt-3 px-3 py-1.5 text-xs text-control-muted hover:text-rose-400 transition"
            >
              Switch User / Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
