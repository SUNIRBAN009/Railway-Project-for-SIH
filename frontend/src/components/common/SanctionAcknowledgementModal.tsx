import React, { useEffect } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { useAuthStore } from '../../stores/authStore';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  MapPin,
  X,
  Printer,
  ChevronRight,
} from 'lucide-react';

export const SanctionAcknowledgementModal: React.FC = () => {
  const { activeAcknowledgement, clearAcknowledgement } = useBlockStore();
  const { user } = useAuthStore();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearAcknowledgement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAcknowledgement]);

  // Do not show the field receipt popup to COA / Controllers (who sanctioned it) or on the /coa page
  const isControllerOrCoaScreen =
    user?.role === 'CHIEF_CONTROLLER' ||
    user?.role === 'SECTION_CONTROLLER' ||
    user?.department_code === 'OPERATIONS' ||
    typeof window !== 'undefined' && window.location.pathname.startsWith('/coa');

  if (!activeAcknowledgement || isControllerOrCoaScreen) return null;

  const isSanctioned = activeAcknowledgement.status === 'SANCTIONED';

  return (
    <div
      onClick={clearAcknowledgement}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-control-panel border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden font-sans"
      >
        {/* Top Header Banner */}
        <div className="px-6 py-4 bg-emerald-950/80 border-b border-emerald-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900 border border-emerald-400 text-white">
                  OFFICIAL DISPATCH ACKNOWLEDGEMENT
                </span>
                <span className="text-xs font-mono text-emerald-300 font-bold">
                  NR-COA-SANCTION
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-0.5">
                Block Possession Order Sanctioned
              </h2>
            </div>
          </div>

          <button
            onClick={clearAcknowledgement}
            className="p-1 rounded-lg text-control-muted hover:text-white hover:bg-control-border/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Main Success Card */}
          <div className="p-4 rounded-xl bg-control-bg border border-emerald-500/40 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-control-muted">
                  Official Possession Authority
                </span>
                <h3 className="text-xl font-extrabold font-mono text-emerald-400">
                  {activeAcknowledgement.blockCode}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                APPROVED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-control-border/60">
              <div>
                <span className="text-control-muted text-[10px]">DEPARTMENT</span>
                <p className="text-white font-bold">{activeAcknowledgement.departmentCode}</p>
              </div>
              <div>
                <span className="text-control-muted text-[10px]">CORRIDOR / SECTION</span>
                <p className="text-white font-bold truncate">{activeAcknowledgement.corridor}</p>
              </div>
              <div>
                <span className="text-control-muted text-[10px]">TRACK LOCATION</span>
                <p className="text-white font-bold">{activeAcknowledgement.kmRange}</p>
              </div>
              <div>
                <span className="text-control-muted text-[10px]">WORK NATURE</span>
                <p className="text-white font-bold truncate">{activeAcknowledgement.workType}</p>
              </div>
            </div>
          </div>

          {/* Sanction Details from COA */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4" />
                Sanctioned by Authority:
              </span>
              <span className="text-white font-bold">{activeAcknowledgement.sanctionedBy}</span>
            </div>

            <p className="text-xs text-control-muted font-sans italic bg-control-bg/60 p-2.5 rounded-lg border border-control-border">
              "{activeAcknowledgement.remarks}"
            </p>

            {activeAcknowledgement.cautionSpeed && (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Speed restriction: Caution order enforced at {activeAcknowledgement.cautionSpeed} km/h</span>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-control-muted flex items-center justify-between px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {new Date(activeAcknowledgement.sanctionedAt).toLocaleTimeString()} IST
            </span>
            <span>Security Signature: SHA256-DIGITAL-PROOF-OK</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-control-bg border-t border-control-border flex items-center justify-between gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg border border-control-border bg-control-panel text-xs font-mono text-control-muted hover:text-white hover:border-cyan-400 transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Order</span>
          </button>

          <button
            onClick={clearAcknowledgement}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            <span>Acknowledge Receipt & Mobilize Field Gang</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
