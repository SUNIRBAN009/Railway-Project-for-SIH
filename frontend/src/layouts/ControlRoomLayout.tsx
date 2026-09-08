import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { NotificationPanel } from '../components/layout/NotificationPanel';
import { Maximize2, Minimize2, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface ControlRoomLayoutProps {
  children: React.ReactNode;
}

export const ControlRoomLayout: React.FC<ControlRoomLayoutProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-control-bg text-control-text flex flex-col font-sans">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Mission Critical Real-time Operations Strip */}
          <div className="px-6 py-2.5 border-b border-control-border bg-control-panel/80 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  COA CENTRAL CONTROL COMMAND • DELHI DIVISION
                </span>
              </div>
              <span className="hidden md:inline-block text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                SWEEP-LINE ENGINE: ARMED
              </span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="hidden lg:flex items-center space-x-4 text-control-muted">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Punctuality: <strong className="text-emerald-400">96.8%</strong>
                </span>
                <span>•</span>
                <span>
                  Shadow Gain: <strong className="text-cyan-400">+42.5%</strong>
                </span>
                <span>•</span>
                <span>
                  Safety Proofs: <strong className="text-emerald-400">HermiT DL OK</strong>
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                title="Toggle 4K Video Wall Fullscreen Mode"
                className="p-1.5 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-cyan-300 hover:border-cyan-500/40 transition flex items-center gap-1.5"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[10px]">VIDEO WALL</span>
              </button>
            </div>
          </div>

          {/* Main Control Room Canvas */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      {/* Slide-over Notification Panel */}
      <NotificationPanel />
    </div>
  );
};
