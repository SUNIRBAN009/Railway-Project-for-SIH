import React, { useState } from 'react';
import { Block } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  MapPin,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface BlockSanctionPanelProps {
  block: Block | null;
  onSanction: (blockId: string, remarks: string) => void;
  onConditionalSanction: (blockId: string, cautionSpeed: number, remarks: string) => void;
  onRevise: (blockId: string, reason: string) => void;
}

export const BlockSanctionPanel: React.FC<BlockSanctionPanelProps> = ({
  block,
  onSanction,
  onConditionalSanction,
  onRevise,
}) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState('');
  const [cautionSpeed, setCautionSpeed] = useState(45);
  const [showConditionalModal, setShowConditionalModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseReason, setReviseReason] = useState('Conflict with high-priority mail/express corridor path.');

  if (!block) {
    return (
      <div className="bg-control-panel border border-control-border rounded-xl p-8 shadow-lg text-center space-y-3">
        <FileCheck className="w-12 h-12 text-control-muted mx-auto opacity-50" />
        <h3 className="text-sm font-bold font-mono text-white">No Possession Selected</h3>
        <p className="text-xs text-control-muted max-w-sm mx-auto font-mono">
          Select a pending track possession from the queue to review parameters, verify HermiT DL safety proofs, and grant COA sanction.
        </p>
      </div>
    );
  }

  const handleFullSanction = () => {
    onSanction(block.id, remarks || 'Sanctioned by COA Chief Operating Controller.');
    setRemarks('');
  };

  const handleConditionalSubmit = () => {
    onConditionalSanction(
      block.id,
      cautionSpeed,
      remarks || `Conditional sanction granted with ${cautionSpeed} km/h caution order.`
    );
    setShowConditionalModal(false);
    setRemarks('');
  };

  const handleReviseSubmit = () => {
    onRevise(block.id, reviseReason);
    setShowReviseModal(false);
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-control-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Chief Controller Possession Sanction Terminal
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Possession Code: <span className="text-cyan-400 font-bold">{block.block_code}</span> • IR Rulebook Authority
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
          DEPT: {block.department_code}
        </span>
      </div>

      {/* Block Profile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-control-bg/80 p-3.5 rounded-xl border border-control-border text-xs font-mono">
        <div>
          <span className="text-control-muted block text-[10px]">CORRIDOR / LINE</span>
          <span className="font-bold text-white mt-0.5 block">{block.corridor?.code}</span>
          <span className="text-[10px] text-cyan-400">{block.line_type} LINE</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">KILOMETER SPAN</span>
          <span className="font-bold text-white mt-0.5 block">
            KM {block.start_km.toFixed(1)} – {block.end_km.toFixed(1)}
          </span>
          <span className="text-[10px] text-control-muted">{(block.end_km - block.start_km).toFixed(2)} KM</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">SCHEDULE (IST)</span>
          <span className="font-bold text-white mt-0.5 block">
            {block.scheduled_start_time.split('T')[1]?.substring(0, 5)}–{block.scheduled_end_time.split('T')[1]?.substring(0, 5)}
          </span>
          <span className="text-[10px] text-emerald-400">180 Mins Duration</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">25kV TRACTION</span>
          <span className={`font-bold mt-0.5 block ${block.traction_power_cutoff_required ? 'text-amber-400' : 'text-slate-300'}`}>
            {block.traction_power_cutoff_required ? 'POWER CUTOFF' : 'LIVE CATENARY'}
          </span>
          <span className="text-[10px] text-control-muted">Permit Required</span>
        </div>
      </div>

      <div className="text-xs font-mono text-slate-300 p-3 rounded-lg bg-control-bg/50 border border-control-border">
        <span className="text-control-muted block text-[10px] uppercase font-bold mb-1">Work Description & Scope:</span>
        {block.work_description || block.work_type}
      </div>

      {/* Controller Remarks Input */}
      <div className="space-y-1.5 font-mono text-xs">
        <label className="text-slate-300 block">
          Chief Controller Sanction Endorsement Remarks:
        </label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Sanctioned subject to prompt restoration by 04:30 IST. Inform Section Controller Ghaziabad."
          className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400 text-xs font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-control-border">
        <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>HermiT DL Safety Check: <strong>PASSED (Zero Inconsistencies)</strong></span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowReviseModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return for Revision</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConditionalModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-amber-500/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Conditional Sanction</span>
          </button>

          <button
            type="button"
            onClick={handleFullSanction}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-extrabold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>SANCTION BLOCK</span>
          </button>
        </div>
      </div>

      {/* Conditional Sanction Modal */}
      {showConditionalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-control-panel border border-control-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Conditional Sanction Safeguards
            </h3>
            <p className="text-xs text-control-muted font-sans">
              Specify operational speed caps or traction safeguards before granting conditional possession authority.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Caution Order Speed Cap (km/h)</label>
                <input
                  type="number"
                  value={cautionSpeed}
                  onChange={(e) => setCautionSpeed(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Mandatory Condition Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Speed cap enforced. SNT supervisor must be on-site."
                  className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-control-border">
              <button
                type="button"
                onClick={() => setShowConditionalModal(false)}
                className="px-3 py-1.5 rounded-lg border border-control-border text-control-muted text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConditionalSubmit}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold"
              >
                Endorse Conditional Sanction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-control-panel border border-control-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              Return Block for Revision
            </h3>
            <p className="text-xs text-control-muted font-sans">
              Provide feedback for the Junior Engineer & SSE to modify possession intervals or machinery allocation.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <label className="text-slate-300 block">Revision Directives</label>
              <textarea
                rows={3}
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-control-border">
              <button
                type="button"
                onClick={() => setShowReviseModal(false)}
                className="px-3 py-1.5 rounded-lg border border-control-border text-control-muted text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviseSubmit}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold"
              >
                Transmit Back to Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
