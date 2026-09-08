import React, { useState } from 'react';
import { ConflictItem } from '../../types';
import { AlertTriangle, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface ConflictAlertProps {
  conflict: ConflictItem;
  onAcceptShift?: (shiftedMinutes: number) => void;
  onDismiss?: () => void;
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({
  conflict,
  onAcceptShift,
  onDismiss,
}) => {
  const [accepted, setAccepted] = useState(false);

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'border-rose-500/60 bg-rose-950/40 text-rose-300';
      case 'MAJOR':
        return 'border-amber-500/60 bg-amber-950/40 text-amber-300';
      case 'MODERATE':
      default:
        return 'border-yellow-500/60 bg-yellow-950/40 text-yellow-300';
    }
  };

  const handleAccept = () => {
    setAccepted(true);
    if (onAcceptShift) {
      onAcceptShift(conflict.recommended_shift_minutes);
    }
  };

  if (accepted) {
    return (
      <div className="p-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 flex items-center justify-between animate-fadeIn">
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            AI Suggestion Applied: Possession time shifted by <strong>+{conflict.recommended_shift_minutes} mins</strong>. Sweep-line conflict resolved.
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/40">
          RESOLVED
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${getSeverityStyle(conflict.severity)} shadow-lg shadow-black/40`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-900/40 border border-rose-500/40 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-rose-900/70 border border-rose-500 text-rose-200">
                SWEEP-LINE CONFLICT
              </span>
              <span className="text-xs font-mono text-slate-300">
                KM {conflict.start_km.toFixed(1)} – {conflict.end_km.toFixed(1)}
              </span>
              {conflict.conflicting_train_number && (
                <span className="text-xs font-mono font-bold text-cyan-300">
                  ⚡ Train #{conflict.conflicting_train_number} ({conflict.conflicting_train_name})
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
              {conflict.resolution_suggestion}
            </p>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
              <span>Estimated Passenger Delay: <strong className="text-rose-400">+{conflict.estimated_delay_minutes} min</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-cyan-300">
                <Clock className="w-3 h-3" />
                Shift: +{conflict.recommended_shift_minutes} min
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Apply Time Shift</span>
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white font-mono text-xs transition"
            >
              Ignore
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
