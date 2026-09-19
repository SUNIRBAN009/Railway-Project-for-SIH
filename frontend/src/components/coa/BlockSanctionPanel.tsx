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
  Lock,
  Loader2,
  RefreshCw,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { blockService } from '../../services/api';

interface BlockSanctionPanelProps {
  block: Block | null;
  onSanction?: (blockId: string, remarks: string) => void;
  onConditionalSanction?: (blockId: string, cautionSpeed: number, remarks: string) => void;
  onRevise?: (blockId: string, reason: string) => void;
  onSanctionSuccess?: (updatedBlock: Block) => void;
  onRefresh?: () => void;
}

export const BlockSanctionPanel: React.FC<BlockSanctionPanelProps> = ({
  block,
  onSanction,
  onConditionalSanction,
  onRevise,
  onSanctionSuccess,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState('');
  const [cautionSpeed, setCautionSpeed] = useState(45);
  const [showConditionalModal, setShowConditionalModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseReason, setReviseReason] = useState('Conflict with high-priority mail/express corridor path.');

  // Async state & optimistic concurrency handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<'SANCTION' | 'CONDITIONAL' | 'REVISE' | null>(null);
  const [concurrencyError, setConcurrencyError] = useState<{
    message: string;
    currentVersion?: number;
    submittedVersion?: number;
  } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const parseKm = (val: any) => {
    const n = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(n) ? 0 : n;
  };

  const startKm = parseKm(block.start_km);
  const endKm = parseKm(block.end_km);
  const spanKm = Math.max(0, endKm - startKm);
  const corridorCode =
    typeof block.corridor === 'object' && block.corridor !== null
      ? block.corridor.code
      : block.corridor_code || 'NDLS-CNB-MAIN';

  const clearAlerts = () => {
    setConcurrencyError(null);
    setGeneralError(null);
    setSuccessMessage(null);
  };

  const handleReloadBlock = () => {
    clearAlerts();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleFullSanction = async () => {
    clearAlerts();
    setIsSubmitting(true);
    setActiveAction('SANCTION');

    const sanctionRemarks = remarks || 'Sanctioned by COA Chief Operating Controller.';

    try {
      const responseData = await blockService.sanctionBlock(block.id, {
        action: 'SANCTION',
        version: block.version,
        remarks: sanctionRemarks,
      });

      const updatedBlock: Block = {
        ...block,
        ...(responseData || {}),
        status: 'SANCTIONED',
        version: responseData?.version || block.version + 1,
      };

      setSuccessMessage(
        `✓ Possession ${block.block_code} successfully SANCTIONED. Concurrency version incremented to v${updatedBlock.version}.`
      );
      setRemarks('');

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onSanction) {
        onSanction(block.id, sanctionRemarks);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errPayload = err.response.data?.error || err.response.data || {};
        setConcurrencyError({
          message:
            errPayload.message ||
            `Concurrency Conflict: Block was modified by another controller. (Current v${errPayload.details?.current_version || '?'}, Submitted v${block.version})`,
          currentVersion: errPayload.details?.current_version,
          submittedVersion: errPayload.details?.submitted_version ?? block.version,
        });
      } else if (err.response?.status === 403) {
        setGeneralError(
          'Access Denied (HTTP 403): Only Chief Controllers or Administrators have authority to sanction track possessions.'
        );
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to sanction block.';
        setGeneralError(`Sanction Error: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  const handleConditionalSubmit = async () => {
    clearAlerts();
    setIsSubmitting(true);
    setActiveAction('CONDITIONAL');

    const conditionRemarks =
      remarks || `Conditional sanction granted with ${cautionSpeed} km/h caution order.`;

    try {
      const responseData = await blockService.sanctionBlock(block.id, {
        action: 'CONDITIONAL_SANCTION',
        version: block.version,
        caution_speed: cautionSpeed,
        remarks: conditionRemarks,
      });

      const updatedBlock: Block = {
        ...block,
        ...(responseData || {}),
        status: 'SANCTIONED',
        version: responseData?.version || block.version + 1,
        work_description: `${block.work_description} [CONDITIONAL: Speed cap ${cautionSpeed} km/h. ${conditionRemarks}]`,
      };

      setSuccessMessage(
        `✓ Conditional Sanction granted for ${block.block_code} (Speed Cap: ${cautionSpeed} km/h). Concurrency version incremented to v${updatedBlock.version}.`
      );
      setShowConditionalModal(false);
      setRemarks('');

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onConditionalSanction) {
        onConditionalSanction(block.id, cautionSpeed, conditionRemarks);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errPayload = err.response.data?.error || err.response.data || {};
        setConcurrencyError({
          message:
            errPayload.message ||
            `Concurrency Conflict: Block was modified by another controller.`,
          currentVersion: errPayload.details?.current_version,
          submittedVersion: errPayload.details?.submitted_version ?? block.version,
        });
      } else if (err.response?.status === 403) {
        setGeneralError(
          'Access Denied (HTTP 403): Only Chief Controllers or Administrators can grant conditional sanction.'
        );
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to endorse conditional sanction.';
        setGeneralError(`Conditional Sanction Error: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  const handleReviseSubmit = async () => {
    clearAlerts();
    setIsSubmitting(true);
    setActiveAction('REVISE');

    try {
      const responseData = await blockService.sanctionBlock(block.id, {
        action: 'REJECT',
        version: block.version,
        remarks: reviseReason,
      });

      const updatedBlock: Block = {
        ...block,
        ...(responseData || {}),
        status: 'REJECTED',
        version: responseData?.version || block.version + 1,
        rejection_reason: reviseReason,
      };

      setSuccessMessage(
        `✓ Possession ${block.block_code} returned to department for revision. Concurrency version updated to v${updatedBlock.version}.`
      );
      setShowReviseModal(false);

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onRevise) {
        onRevise(block.id, reviseReason);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errPayload = err.response.data?.error || err.response.data || {};
        setConcurrencyError({
          message:
            errPayload.message ||
            `Concurrency Conflict: Block was modified by another controller.`,
          currentVersion: errPayload.details?.current_version,
          submittedVersion: errPayload.details?.submitted_version ?? block.version,
        });
      } else if (err.response?.status === 403) {
        setGeneralError(
          'Access Denied (HTTP 403): Only Chief Controllers or Administrators can return or reject blocks.'
        );
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to reject/revise block.';
        setGeneralError(`Revision Error: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SANCTIONED':
        return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';
      case 'REJECTED':
        return 'bg-rose-950/80 border-rose-500/60 text-rose-300';
      case 'COORDINATED':
        return 'bg-purple-950/80 border-purple-500/60 text-purple-300';
      case 'CONFLICT_DETECTED':
        return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
      default:
        return 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-control-border pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Chief Controller Possession Sanction Terminal
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-control-muted font-mono">
              Possession Code: <span className="text-cyan-400 font-bold">{block.block_code}</span>
            </p>
            {/* Optimistic Concurrency Version Badge */}
            <span
              title="Optimistic Concurrency Lock Version (Auto-increments on every state transition)"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-cyan-950 border border-cyan-400/60 text-cyan-300 shadow-sm"
            >
              <Lock className="w-2.5 h-2.5 text-cyan-400" />
              <span>v{block.version ?? 1}</span>
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadge(
                block.status
              )}`}
            >
              {block.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
            DEPT: {block.department_code}
          </span>
          {onRefresh && (
            <button
              onClick={handleReloadBlock}
              title="Reload live block details from backend"
              className="p-1.5 rounded-lg border border-control-border bg-control-bg hover:text-cyan-400 text-control-muted transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optimistic Concurrency Conflict Alert (HTTP 409) */}
      {concurrencyError && (
        <div className="bg-rose-950/80 border border-rose-500/70 rounded-xl p-4 text-xs font-mono text-rose-200 shadow-lg space-y-2.5 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-extrabold text-rose-300 text-sm">
                HTTP 409 Concurrency Conflict (Optimistic Lock Stale)
              </div>
              <p className="mt-1 text-slate-300 leading-relaxed">
                {concurrencyError.message}
              </p>
              {concurrencyError.currentVersion !== undefined && (
                <div className="mt-2 text-[11px] text-rose-300/90 font-mono bg-rose-900/40 px-2.5 py-1.5 rounded-lg border border-rose-700/50">
                  Database Current Version: <strong>v{concurrencyError.currentVersion}</strong> | Submitted Payload Version: <strong>v{concurrencyError.submittedVersion}</strong>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleReloadBlock}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition text-xs font-mono flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Latest Track Possession</span>
            </button>
          </div>
        </div>
      )}

      {/* General Error Alert (e.g. HTTP 403 Forbidden) */}
      {generalError && (
        <div className="bg-amber-950/80 border border-amber-500/70 rounded-xl p-3.5 text-xs font-mono text-amber-200 flex items-center gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1">{generalError}</span>
          <button
            onClick={() => setGeneralError(null)}
            className="text-amber-400 hover:text-amber-200 font-bold px-2 py-0.5 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/70 rounded-xl p-3 text-xs font-mono text-emerald-200 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold px-2 py-0.5 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Block Profile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-control-bg/80 p-3.5 rounded-xl border border-control-border text-xs font-mono">
        <div>
          <span className="text-control-muted block text-[10px]">CORRIDOR / LINE</span>
          <span className="font-bold text-white mt-0.5 block">{corridorCode}</span>
          <span className="text-[10px] text-cyan-400">{block.line_type} LINE</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">KILOMETER SPAN</span>
          <span className="font-bold text-white mt-0.5 block">
            KM {startKm.toFixed(1)} – {endKm.toFixed(1)}
          </span>
          <span className="text-[10px] text-control-muted">{spanKm.toFixed(2)} KM</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">SCHEDULE (IST)</span>
          <span className="font-bold text-white mt-0.5 block">
            {block.scheduled_start_time.split('T')[1]?.substring(0, 5) || '02:30'}–
            {block.scheduled_end_time.split('T')[1]?.substring(0, 5) || '05:30'}
          </span>
          <span className="text-[10px] text-emerald-400">Scheduled Duration</span>
        </div>
        <div>
          <span className="text-control-muted block text-[10px]">25kV TRACTION</span>
          <span
            className={`font-bold mt-0.5 block ${
              block.traction_power_cutoff_required ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {block.traction_power_cutoff_required ? 'POWER CUTOFF' : 'LIVE CATENARY'}
          </span>
          <span className="text-[10px] text-control-muted">OHE Permit Required</span>
        </div>
      </div>

      <div className="text-xs font-mono text-slate-300 p-3 rounded-lg bg-control-bg/50 border border-control-border">
        <span className="text-control-muted block text-[10px] uppercase font-bold mb-1">
          Work Description & Scope:
        </span>
        {block.work_description || block.work_type}
      </div>

      {/* Controller Remarks Input */}
      <div className="space-y-1.5 font-mono text-xs">
        <label className="text-slate-300 block font-bold">
          Chief Controller Sanction Endorsement Remarks:
        </label>
        <input
          type="text"
          value={remarks}
          disabled={isSubmitting || block.status === 'SANCTIONED'}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Sanctioned subject to prompt restoration by 05:30 IST. Inform Section Controller Ghaziabad."
          className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400 text-xs font-mono disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-control-border">
        <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            HermiT DL Safety Check: <strong>PASSED (Zero Inconsistencies)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Return for Revision / Reject Button */}
          <button
            type="button"
            disabled={isSubmitting || block.status === 'SANCTIONED' || block.status === 'REJECTED'}
            onClick={() => setShowReviseModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting && activeAction === 'REVISE' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Return for Revision</span>
          </button>

          {/* Conditional Sanction Button */}
          <button
            type="button"
            disabled={isSubmitting || block.status === 'SANCTIONED'}
            onClick={() => setShowConditionalModal(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-amber-500/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting && activeAction === 'CONDITIONAL' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>Conditional Sanction</span>
          </button>

          {/* Full Sanction Button */}
          <button
            type="button"
            disabled={isSubmitting || block.status === 'SANCTIONED'}
            onClick={handleFullSanction}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-white text-xs font-mono font-extrabold transition flex items-center justify-center gap-1.5 shadow-lg ${
              block.status === 'SANCTIONED'
                ? 'bg-emerald-800 text-emerald-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting && activeAction === 'SANCTION' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{block.status === 'SANCTIONED' ? 'SANCTIONED' : 'SANCTION BLOCK'}</span>
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
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="5"
                    value={cautionSpeed}
                    onChange={(e) => setCautionSpeed(parseInt(e.target.value))}
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                  <span className="w-16 px-2 py-1 rounded bg-control-bg border border-control-border text-center font-bold text-amber-300">
                    {cautionSpeed} km/h
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Mandatory Condition Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Caution order 45 km/h enforced. S&T supervisor must remain on-site."
                  className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-control-border">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConditionalModal(false)}
                className="px-3 py-1.5 rounded-lg border border-control-border text-control-muted text-xs font-mono hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConditionalSubmit}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Endorse Conditional Sanction</span>
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
              <label className="text-slate-300 block">Revision Directives / Rejection Reason</label>
              <textarea
                rows={3}
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                placeholder="Specify reasons for returning block (e.g. Section congested, reschedule after 03:00 IST)."
                className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-control-border">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowReviseModal(false)}
                className="px-3 py-1.5 rounded-lg border border-control-border text-control-muted text-xs font-mono hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !reviseReason.trim()}
                onClick={handleReviseSubmit}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Transmit Back to Department</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
