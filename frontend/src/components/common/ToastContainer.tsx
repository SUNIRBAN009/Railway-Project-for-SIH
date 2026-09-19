import React from 'react';
import { useToastStore, ToastItem } from '../../stores/toastStore';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onClose: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onClose }) => {
  const getTheme = () => {
    switch (toast.type) {
      case 'error':
        return {
          container:
            'bg-slate-900/95 border-rose-500/80 text-rose-100 shadow-rose-950/40 shadow-xl ring-1 ring-rose-500/30',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />,
        };
      case 'warning':
        return {
          container:
            'bg-slate-900/95 border-amber-500/80 text-amber-100 shadow-amber-950/40 shadow-xl ring-1 ring-amber-500/30',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
        };
      case 'success':
        return {
          container:
            'bg-slate-900/95 border-emerald-500/80 text-emerald-100 shadow-emerald-950/40 shadow-xl ring-1 ring-emerald-500/30',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
        };
      case 'info':
      default:
        return {
          container:
            'bg-slate-900/95 border-cyan-500/80 text-cyan-100 shadow-cyan-950/40 shadow-xl ring-1 ring-cyan-500/30',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />,
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`pointer-events-auto border rounded-xl p-4 backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-slideDown ${theme.container}`}
    >
      <div className="flex items-start gap-3">
        {theme.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {toast.ruleNumber && (
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-extrabold tracking-wider ${theme.badge}`}
              >
                RULE {toast.ruleNumber} VIOLATION
              </span>
            )}
            <h4 className="text-xs font-mono font-bold tracking-wide text-white truncate">
              {toast.title}
            </h4>
          </div>
          <p className="text-xs font-sans text-slate-300 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10 shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
