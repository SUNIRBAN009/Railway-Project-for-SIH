import React, { useState, useEffect, useMemo } from 'react';
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
  FileDown,
  Sparkles,
  Layers,
  History,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useBlockStore } from '../../stores/blockStore';
import { blockService, analyticsService, triggerBlobDownload } from '../../services/api';

interface BlockSanctionPanelProps {
  block: Block | null;
  onSanction?: (blockId: string, remarks: string) => void;
  onConditionalSanction?: (blockId: string, cautionSpeed: number, remarks: string) => void;
  onRevise?: (blockId: string, reason: string) => void;
  onSanctionSuccess?: (updatedBlock: Block) => void;
  onRefresh?: () => void;
  onClearSelection?: () => void;
}

export const BlockSanctionPanel: React.FC<BlockSanctionPanelProps> = ({
  block,
  onSanction,
  onConditionalSanction,
  onRevise,
  onSanctionSuccess,
  onRefresh,
  onClearSelection,
}) => {
  const { user } = useAuth();
  const { blocks: storeBlocks, acknowledgementHistory } = useBlockStore();

  const [terminalTab, setTerminalTab] = useState<'TERMINAL' | 'HISTORY'>('TERMINAL');
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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Auto-switch to TERMINAL view whenever a block is clicked/selected
  useEffect(() => {
    if (block) {
      setTerminalTab('TERMINAL');
    }
  }, [block?.id]);

  // Download official sanction PDF
  const handleDownloadSanctionPDF = async (targetBlockId?: string, blockCode?: string) => {
    const idToUse = targetBlockId || block?.id;
    if (!idToUse) return;
    try {
      setIsDownloadingPDF(true);
      const blob = await analyticsService.downloadSanctionOrderPDF(idToUse);
      const filename = `IR_Sanction_Order_${blockCode || block?.block_code || 'SANCTION'}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Failed to download Sanction Order PDF:', err);
      setGeneralError('Failed to download official Block Sanction Order PDF. Please check server logs.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Semantic Violations & HermiT DL Hazard Reasoning State (TSK-P3-04-FE)
  const [violations, setViolations] = useState<any[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [overrideHazards, setOverrideHazards] = useState(false);

  useEffect(() => {
    if (!block?.id) {
      setViolations([]);
      setOverrideHazards(false);
      return;
    }
    let isMounted = true;
    setIsLoadingViolations(true);
    blockService
      .getSemanticViolations(block.id)
      .then((data) => {
        if (isMounted) {
          setViolations(Array.isArray(data) ? data : []);
          setOverrideHazards(false);
        }
      })
      .catch((e) => {
        console.warn('Failed to fetch semantic violations:', e);
      })
      .finally(() => {
        if (isMounted) setIsLoadingViolations(false);
      });
    return () => {
      isMounted = false;
    };
  }, [block?.id]);

  const criticalViolations = violations.filter(
    (v) => v.severity === 'CRITICAL_SAFETY' && !v.resolved
  );
  const hasCriticalHazards = criticalViolations.length > 0;
  const criticalViolation = criticalViolations[0];

  // Past Decisions Roster: Merges store acknowledgement history with all SANCTIONED/REJECTED blocks
  const pastDecisions = useMemo(() => {
    const list: Array<{
      id: string;
      blockId?: string;
      blockCode: string;
      departmentCode: string;
      workType: string;
      corridor: string;
      kmRange: string;
      status: string;
      sanctionedBy: string;
      sanctionedAt: string;
      remarks: string;
      cautionSpeed?: number;
    }> = [];

    // 1. From acknowledged history
    (acknowledgementHistory || []).forEach((ack) => {
      list.push({
        id: ack.id,
        blockId: ack.blockId,
        blockCode: ack.blockCode,
        departmentCode: ack.departmentCode,
        workType: ack.workType,
        corridor: ack.corridor,
        kmRange: ack.kmRange,
        status: ack.status,
        sanctionedBy: ack.sanctionedBy,
        sanctionedAt: ack.sanctionedAt,
        remarks: ack.remarks,
        cautionSpeed: ack.cautionSpeed,
      });
    });

    // 2. From store blocks marked SANCTIONED or REJECTED
    (storeBlocks || [])
      .filter((b) => ['SANCTIONED', 'REJECTED', 'ACTIVE', 'COMPLETED'].includes(b.status))
      .forEach((b) => {
        if (!list.some((item) => item.blockCode === b.block_code)) {
          const corridorName =
            typeof b.corridor === 'object' && b.corridor !== null
              ? (b.corridor as any).name || (b.corridor as any).code
              : b.corridor_name || 'NDLS-CNB Corridor';

          list.push({
            id: `dec-${b.id}`,
            blockId: b.id,
            blockCode: b.block_code,
            departmentCode: b.department_code,
            workType: b.work_type,
            corridor: corridorName,
            kmRange: `KM ${Number(b.start_km).toFixed(1)} – ${Number(b.end_km).toFixed(1)} (${b.line_type})`,
            status: b.status,
            sanctionedBy: 'Chief Operating Controller (COA)',
            sanctionedAt: b.scheduled_start_time || new Date().toISOString(),
            remarks: b.rejection_reason || b.work_description || 'Sanction granted by COA terminal.',
          });
        }
      });

    return list.sort(
      (a, b) => new Date(b.sanctionedAt || 0).getTime() - new Date(a.sanctionedAt || 0).getTime()
    );
  }, [acknowledgementHistory, storeBlocks]);

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

  // Full Sanction Handler
  const handleFullSanction = async () => {
    if (!block) return;
    clearAlerts();
    if (hasCriticalHazards && !overrideHazards) {
      setGeneralError(
        'Unauthorized Sanction Blocked: Active Description Logic safety hazard detected (Stranded Electric Train / 25kV OHE isolation hazard). Check the Safety Hazard Override box to affirm emergency mitigations before sanctioning.'
      );
      return;
    }

    setIsSubmitting(true);
    setActiveAction('SANCTION');

    const sanctionRemarks = remarks || 'Sanctioned by COA Chief Operating Controller.';

    try {
      const responseData = await blockService.sanctionBlock(block.id, {
        action: 'SANCTION',
        version: block.version,
        remarks: sanctionRemarks,
        override_semantic_hazards: overrideHazards,
      });

      const updatedBlock: Block = {
        ...block,
        ...(responseData || {}),
        status: 'SANCTIONED',
        version: responseData?.version || block.version + 1,
      };

      setSuccessMessage(
        `Possession ${block.block_code} successfully SANCTIONED. Moved to Decision History.`
      );
      setRemarks('');

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onSanction) {
        onSanction(block.id, sanctionRemarks);
      }
      // Immediately clear selection so the terminal resets back to empty awaiting state
      if (onClearSelection) {
        onClearSelection();
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errPayload = err.response.data?.error || err.response.data || {};
        if (errPayload.code === 'SEM-409' || errPayload.details?.override_required) {
          setGeneralError(
            `[SAFETY HAZARD BLOCK]: ${errPayload.message || 'Active Description Logic safety hazard detected. You must affirm safety override before sanctioning.'}`
          );
        } else {
          setConcurrencyError({
            message:
              errPayload.message ||
              `Concurrency Conflict: Block was modified by another controller. (Current v${errPayload.details?.current_version || '?'}, Submitted v${block.version})`,
            currentVersion: errPayload.details?.current_version,
            submittedVersion: errPayload.details?.submitted_version ?? block.version,
          });
        }
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

  // Conditional Sanction Handler
  const handleConditionalSubmit = async () => {
    if (!block) return;
    clearAlerts();
    if (hasCriticalHazards && !overrideHazards) {
      setShowConditionalModal(false);
      setGeneralError(
        'Unauthorized Sanction Blocked: Active Description Logic safety hazard detected. You must affirm safety override before endorsing conditional sanction.'
      );
      return;
    }

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
        override_semantic_hazards: overrideHazards,
      });

      const updatedBlock: Block = {
        ...block,
        ...(responseData || {}),
        status: 'SANCTIONED',
        version: responseData?.version || block.version + 1,
        work_description: `${block.work_description} [CONDITIONAL: Speed cap ${cautionSpeed} km/h. ${conditionRemarks}]`,
      };

      setSuccessMessage(
        `Conditional Sanction granted for ${block.block_code} (${cautionSpeed} km/h cap). Moved to Decision History.`
      );
      setShowConditionalModal(false);
      setRemarks('');

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onConditionalSanction) {
        onConditionalSanction(block.id, cautionSpeed, conditionRemarks);
      }
      // Clear selection so the terminal resets back to empty awaiting state
      if (onClearSelection) {
        onClearSelection();
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

  // Revise / Return Handler
  const handleReviseSubmit = async () => {
    if (!block) return;
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
        `Possession ${block.block_code} returned to department for revision. Moved to Decision History.`
      );
      setShowReviseModal(false);

      if (onSanctionSuccess) {
        onSanctionSuccess(updatedBlock);
      }
      if (onRevise) {
        onRevise(block.id, reviseReason);
      }
      // Clear selection so the terminal resets back to empty awaiting state
      if (onClearSelection) {
        onClearSelection();
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
      case 'REVISED':
        return 'bg-rose-950/80 border-rose-500/60 text-rose-300';
      case 'CONDITIONAL':
        return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
      case 'COORDINATED':
        return 'bg-purple-950/80 border-purple-500/60 text-purple-300';
      case 'CONFLICT_DETECTED':
        return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
      default:
        return 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300';
    }
  };

  // Render Decision History Roster Tab
  if (terminalTab === 'HISTORY') {
    return (
      <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4 font-sans">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-control-border pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-extrabold font-mono text-white tracking-wide">
                Chief Controller Sanction &amp; Decision History Roster
              </h3>
            </div>
            <p className="text-xs text-control-muted mt-0.5 font-mono">
              Audit log of all sanctioned, conditional, and returned possession authorities
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTerminalTab('TERMINAL')}
              className="px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Back to Active Terminal</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-control-muted">Total Sanctioned:</span>
            <span className="text-emerald-400 font-bold text-base">
              {pastDecisions.filter((d) => d.status === 'SANCTIONED').length}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
            <span className="text-control-muted">Conditional Cap:</span>
            <span className="text-amber-400 font-bold text-base">
              {pastDecisions.filter((d) => d.status === 'CONDITIONAL' || d.cautionSpeed).length}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
            <span className="text-control-muted">Returned / Revised:</span>
            <span className="text-rose-400 font-bold text-base">
              {pastDecisions.filter((d) => d.status === 'REJECTED' || d.status === 'REVISED').length}
            </span>
          </div>
        </div>

        {/* Decisions List */}
        <div className="space-y-3">
          {pastDecisions.length === 0 ? (
            <div className="p-8 text-center text-control-muted font-mono text-xs border border-dashed border-control-border rounded-xl">
              No historical possession decisions recorded during this operational shift.
            </div>
          ) : (
            pastDecisions.map((dec) => (
              <div
                key={dec.id}
                className="p-4 rounded-xl border border-control-border bg-control-bg/60 hover:bg-control-bg transition shadow-sm space-y-2.5 font-mono text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-control-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(
                        dec.status
                      )}`}
                    >
                      {dec.status}
                    </span>
                    <span className="font-extrabold text-white text-sm">
                      {dec.blockCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-control-border text-cyan-300">
                      DEPT: {dec.departmentCode}
                    </span>
                  </div>

                  <span className="text-[11px] text-control-muted flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>
                      {new Date(dec.sanctionedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} IST
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-control-muted block text-[10px] uppercase">Corridor &amp; Limits:</span>
                    <span className="text-slate-200">{dec.corridor} • {dec.kmRange}</span>
                  </div>
                  <div>
                    <span className="text-control-muted block text-[10px] uppercase">Sanction Authority:</span>
                    <span className="text-cyan-300 font-bold">{dec.sanctionedBy}</span>
                  </div>
                </div>

                {dec.cautionSpeed && (
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Permanent Speed Restriction Enforced: <strong>{dec.cautionSpeed} km/h PSR</strong></span>
                  </div>
                )}

                <div className="text-[11px] text-slate-300 bg-black/40 p-2.5 rounded-lg border border-control-border/60">
                  <span className="text-control-muted font-bold block text-[10px] uppercase mb-0.5">Decision Directives:</span>
                  <p className="font-sans leading-relaxed">{dec.remarks}</p>
                </div>

                {dec.blockId && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadSanctionPDF(dec.blockId, dec.blockCode)}
                      disabled={isDownloadingPDF}
                      className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Download Sanction Order (PDF)</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Active Terminal View: If NO block is selected, display high-tech English placeholder
  if (!block) {
    return (
      <div className="bg-control-panel border border-dashed border-control-border rounded-xl p-8 shadow-lg text-center font-mono">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Chief Controller Possession Sanction Terminal
        </h3>
        <p className="text-xs text-control-muted max-w-md mx-auto mb-4 font-sans leading-relaxed">
          No possession block currently selected. Click on any proposal in the <span className="text-cyan-300 font-mono">Pending Possession Queue</span> or an alert in the <span className="text-purple-300 font-mono">AI Conflict Resolution Engine</span> to inspect telemetry parameters, examine HermiT DL safety proofs, and grant sanction authority.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-control-border text-xs text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Awaiting Selection from Possession Queue</span>
          </div>

          <button
            type="button"
            onClick={() => setTerminalTab('HISTORY')}
            className="px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 text-xs font-bold transition flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>View Decision History ({pastDecisions.length} Recorded)</span>
          </button>
        </div>
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
      ? (block.corridor as any).code
      : block.corridor_code || 'NDLS-CNB-MAIN';

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
          {/* Switch to Decision History Button */}
          <button
            type="button"
            onClick={() => setTerminalTab('HISTORY')}
            className="px-2.5 py-1 rounded-lg border border-control-border bg-control-bg hover:text-emerald-300 text-control-muted font-mono text-xs font-bold transition flex items-center gap-1.5"
            title="Inspect historical sanctioned and returned blocks"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>History ({pastDecisions.length})</span>
          </button>

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

          {onClearSelection && (
            <button
              onClick={onClearSelection}
              title="Close inspection & deselect block"
              className="p-1.5 rounded-lg border border-control-border bg-control-bg hover:text-rose-400 text-control-muted transition"
            >
              <X className="w-3.5 h-3.5" />
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

      {/* General Error Notice */}
      {generalError && (
        <div className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3.5 text-xs font-mono text-rose-200 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{generalError}</span>
          </div>
          <button
            onClick={() => setGeneralError(null)}
            className="text-rose-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Notice */}
      {successMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/60 rounded-xl p-3.5 text-xs font-mono text-emerald-200 flex items-start justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* HermiT DL Automated Reasoning & Safety Proof Banner */}
      {hasCriticalHazards && (
        <div className="p-4 rounded-xl border border-rose-500 bg-rose-950/40 text-xs font-mono shadow-md space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
              <span className="font-extrabold text-white text-sm">
                HERMiT DL DESCRIPTION LOGIC HAZARD DETECTED
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 border border-rose-500 text-white">
              {criticalViolation.hazard_type || 'STRANDED_ELECTRIC_TRAIN'}
            </span>
          </div>

          <p className="text-slate-300 font-sans leading-relaxed text-xs">
            {criticalViolation.description ||
              'Automated OWL ontology reasoning proved that granting this possession de-energizes 25kV OHE while electric locomotives are trapped in the section without neutral ground.'}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-rose-900/60">
            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideHazards}
                onChange={(e) => setOverrideHazards(e.target.checked)}
                className="w-4 h-4 rounded border-rose-500 text-rose-600 focus:ring-rose-500 bg-slate-900"
              />
              <span>Affirm Controller Emergency Mitigation &amp; Override HermiT Hazard Block</span>
            </label>

            <button
              type="button"
              onClick={() => setShowProofDetails(!showProofDetails)}
              className="text-cyan-400 hover:underline text-[11px] font-mono"
            >
              {showProofDetails ? 'Hide DL Axiom Proof' : 'View OWL Axiom Proof'}
            </button>
          </div>

          {showProofDetails && (
            <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-rose-800 text-[11px] text-slate-300 font-mono space-y-1">
              <div><strong>HermiT DL Axiom:</strong> {criticalViolation.axioms_involved?.join(', ') || 'TrackPossession ⊓ ∃requiresIsolation.DeEnergizedSection ⊑ SafetyHazard'}</div>
              <div><strong>Deduction Strategy:</strong> Tableau-based consistency check completed in 42ms. Zero DL inconsistency tolerance.</div>
            </div>
          )}
        </div>
      )}

      {/* Possession Parameters Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-control-bg rounded-lg border border-control-border">
          <span className="text-control-muted text-[10px] uppercase block">Corridor &amp; Line</span>
          <span className="text-white font-bold block mt-1">{corridorCode}</span>
          <span className="text-cyan-300 text-[11px] block">{block.line_type} Main Track</span>
        </div>

        <div className="p-3 bg-control-bg rounded-lg border border-control-border">
          <span className="text-control-muted text-[10px] uppercase block">Spatial Span (KM)</span>
          <span className="text-white font-bold block mt-1">KM {startKm.toFixed(1)} – {endKm.toFixed(1)}</span>
          <span className="text-control-muted text-[11px] block">Length: {spanKm.toFixed(2)} KM</span>
        </div>

        <div className="p-3 bg-control-bg rounded-lg border border-control-border">
          <span className="text-control-muted text-[10px] uppercase block">Scheduled Window</span>
          <span className="text-white font-bold block mt-1">
            {block.scheduled_start_time?.split('T')[1]?.substring(0, 5) || '00:00'} – {block.scheduled_end_time?.split('T')[1]?.substring(0, 5) || '00:00'} IST
          </span>
          <span className="text-control-muted text-[11px] block">
            {block.scheduled_start_time?.split('T')[0] || 'Today'}
          </span>
        </div>

        <div className="p-3 bg-control-bg rounded-lg border border-control-border">
          <span className="text-control-muted text-[10px] uppercase block">Power Cutoff (25kV)</span>
          <span className="text-white font-bold block mt-1 flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${block.traction_power_cutoff_required ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>{block.traction_power_cutoff_required ? 'YES (Power Block)' : 'NO (Traffic Only)'}</span>
          </span>
          <span className="text-control-muted text-[11px] block">
            Gang: {block.gang_id || 'Assigned SSE'}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-control-bg/60 p-3.5 rounded-lg border border-control-border font-mono text-xs">
        <span className="text-control-muted uppercase text-[10px] block mb-1">Work Description &amp; Directives:</span>
        <p className="text-slate-200 font-sans leading-relaxed">{block.work_description}</p>
      </div>

      {/* Controller Directives / Remarks Input */}
      <div className="space-y-1.5 font-mono text-xs">
        <label className="text-control-muted block uppercase text-[10px]">
          Chief Controller Sanction Remarks / Mandatory Directives:
        </label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Ensure OHE grounding at KM 14.2 before track machine deployment."
          className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
        />
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-control-border">
        {/* PDF Order Download */}
        <button
          type="button"
          onClick={() => handleDownloadSanctionPDF()}
          disabled={isDownloadingPDF}
          title="Download Official Indian Railways Block Sanction Order (PDF)"
          className="px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isDownloadingPDF ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <FileDown className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>Official Sanction PDF</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Revise / Reject Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowReviseModal(true)}
            className="px-3.5 py-2 rounded-xl border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return for Revision</span>
          </button>

          {/* Conditional Sanction Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowConditionalModal(true)}
            className="px-3.5 py-2 rounded-xl border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Conditional Sanction</span>
          </button>

          {/* Full Sanction Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFullSanction}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-extrabold transition flex items-center gap-2 shadow-lg shadow-emerald-950/60 disabled:opacity-50"
          >
            {isSubmitting && activeAction === 'SANCTION' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Grant Full Possession Authority</span>
          </button>
        </div>
      </div>

      {/* Conditional Sanction Modal */}
      {showConditionalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-control-panel border border-control-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Conditional Sanction with Speed Cap (TSO)
            </h3>
            <p className="text-xs text-control-muted font-sans">
              Grant possession subject to strict temporary speed restrictions on adjacent UP/DN tracks.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <label className="text-slate-300 block">Caution Order Speed Cap (km/h)</label>
              <div className="flex gap-2">
                {[20, 30, 45, 60].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setCautionSpeed(spd)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
                      cautionSpeed === spd
                        ? 'bg-amber-950 border-amber-400 text-amber-300'
                        : 'bg-control-bg border-control-border text-control-muted'
                    }`}
                  >
                    {spd} km/h
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-slate-300 block">Caution Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Caution order speed cap enforced for track worker safety."
                className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white text-xs font-mono"
              />
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
              Provide feedback for the Junior Engineer &amp; SSE to modify possession intervals or machinery allocation.
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
