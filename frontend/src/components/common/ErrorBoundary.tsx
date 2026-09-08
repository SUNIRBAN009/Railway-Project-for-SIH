import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-mono">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl text-rose-400">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-400 tracking-widest uppercase">
                  Indian Railways System Diagnostics
                </span>
                <h1 className="text-xl font-extrabold text-white">
                  Client Console Rendering Interrupted
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected client runtime exception occurred. Fail-safe state containment has been engaged to protect data integrity and active corridor telemetry.
            </p>

            {this.state.error && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-300 overflow-x-auto max-h-40">
                <p className="font-bold">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RELOAD CONSOLE</span>
              </button>

              <button
                onClick={this.handleHardReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-500/50 hover:bg-rose-950/40 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>RESET SESSION</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
