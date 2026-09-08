import React from 'react';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { NotificationPanel } from '../components/layout/NotificationPanel';
import { DepartmentCode } from '../types';

interface DepartmentLayoutProps {
  children: React.ReactNode;
  departmentCode: DepartmentCode;
  departmentTitle: string;
  departmentSubtitle: string;
}

export const DepartmentLayout: React.FC<DepartmentLayoutProps> = ({
  children,
  departmentCode,
  departmentTitle,
  departmentSubtitle,
}) => {
  const getBannerAccent = (dept: DepartmentCode) => {
    switch (dept) {
      case 'ENG':
        return 'from-blue-600/20 via-blue-500/10 to-transparent border-blue-500/30 text-blue-400';
      case 'TRD':
        return 'from-amber-600/20 via-amber-500/10 to-transparent border-amber-500/30 text-amber-400';
      case 'SNT':
        return 'from-emerald-600/20 via-emerald-500/10 to-transparent border-emerald-500/30 text-emerald-400';
      default:
        return 'from-cyan-600/20 via-cyan-500/10 to-transparent border-cyan-500/30 text-cyan-400';
    }
  };

  const accentClass = getBannerAccent(departmentCode);

  return (
    <div className="min-h-screen bg-control-bg text-control-text flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Department Identification Sub-Header Banner */}
          <div className={`px-6 py-3.5 border-b bg-gradient-to-r ${accentClass} flex items-center justify-between`}>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-current">
                  {departmentCode} TERMINAL
                </span>
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  {departmentTitle}
                </h1>
              </div>
              <p className="text-xs text-control-muted mt-0.5">{departmentSubtitle}</p>
            </div>

            <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-black/30 border border-control-border text-slate-300">
                POSSESSION PROTOCOL: ACTIVE
              </span>
            </div>
          </div>

          {/* Main Department Screen Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      {/* Global Slide-Over Dispatch Notification Panel */}
      <NotificationPanel />
    </div>
  );
};
