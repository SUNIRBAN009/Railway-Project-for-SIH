import React, { useState } from 'react';
import { ConflictItem, Block } from '../../types';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Layers,
} from 'lucide-react';

interface ConflictResolutionPanelProps {
  block?: Block | null;
  onApplyResolution?: (conflictId: string, shiftMinutes: number) => void;
}

export const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  block,
  onApplyResolution,
}) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'ENG' | 'TRD' | 'SNT'>('ALL');

  // Map backend BlockConflict to UI ConflictItem
  const conflicts: ConflictItem[] = (block?.conflicts || []).map((bc: any) => {
    // Attempt to extract recommended shift minutes from resolution notes using regex (e.g., "+30 mins" or "shift by 15 mins")
    const shiftMatch = bc.resolution_notes?.match(/(\d+)\s*min/i);
    const shiftMins = shiftMatch ? parseInt(shiftMatch[1], 10) : 30;

    return {
      id: bc.id,
      block_id: block?.block_code || 'UNKNOWN',
      conflicting_train_number: bc.conflicting_entity_id,
      conflicting_train_name: bc.conflicting_entity_label,
      conflict_type: 'TRAIN_COLLISION',
      start_km: Number(bc.overlap_start_km || block?.start_km || 0),
      end_km: Number(bc.overlap_end_km || block?.end_km || 0),
      estimated_delay_minutes: shiftMins,
      resolution_suggestion: bc.resolution_notes || 'Adjust time window to avoid collision.',
      recommended_shift_minutes: shiftMins,
      severity: bc.severity === 'CRITICAL' ? 'CRITICAL' : 'MODERATE',
    };
  });

  const handleResolve = (conflict: ConflictItem) => {
    setResolvedIds((prev) => [...prev, conflict.id]);
    if (onApplyResolution) {
      onApplyResolution(conflict.id, conflict.recommended_shift_minutes);
    }
  };

  const filteredConflicts = conflicts.filter((cnf) => {
    const isResolved = resolvedIds.includes(cnf.id);
    if (activeTab === 'ACTIVE' && isResolved) return false;
    if (activeTab === 'HISTORY' && !isResolved) return false;
    if (deptFilter !== 'ALL' && block?.department_code !== deptFilter) return false;
    return true;
  });

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-control-border pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              AI Sweep-Line Conflict Resolution & Shadow Bundling Engine
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Automated collision detection between track block intervals & priority train paths
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Department Filter */}
          <div className="flex bg-control-bg rounded-lg border border-control-border overflow-hidden text-[10px] font-mono font-bold">
            {['ALL', 'ENG', 'TRD', 'SNT'].map((dept) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept as any)}
                className={`px-2.5 py-1 transition-colors ${
                  deptFilter === dept
                    ? 'bg-purple-900/60 text-purple-300 border-b-2 border-purple-400'
                    : 'text-control-muted hover:text-slate-300'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                activeTab === 'ACTIVE'
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                  : 'bg-control-bg border-control-border text-control-muted'
              }`}
            >
              ACTIVE HAZARDS
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                activeTab === 'HISTORY'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-control-bg border-control-border text-control-muted'
              }`}
            >
              RESOLVED HISTORY
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Items */}
      <div className="space-y-3">
        {conflicts.length === 0 ? (
          <div className="p-4 text-center text-emerald-400 font-mono text-xs border border-dashed border-emerald-500/30 rounded-xl bg-emerald-950/20">
            ✓ Sweep-Line Engine: No temporal or spatial conflicts detected for this possession.
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="p-4 text-center text-control-muted font-mono text-xs border border-dashed border-control-border rounded-xl">
            {activeTab === 'ACTIVE' 
              ? '✓ No active conflicts match the current filter.' 
              : 'No resolved conflicts in history for this selection.'}
          </div>
        ) : (
          filteredConflicts.map((cnf) => {
            const isResolved = resolvedIds.includes(cnf.id);

            return (
              <div
                key={cnf.id}
                className={`p-4 rounded-xl border transition-all ${
                  isResolved
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-950/20 text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        isResolved
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                      }`}
                    >
                      {isResolved ? 'RESOLVED & BUNDLED' : `${cnf.severity} CONFLICT`}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      Block Ref: {cnf.block_id.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-cyan-400">
                    KM {cnf.start_km.toFixed(1)} – {cnf.end_km.toFixed(1)}
                  </span>
                </div>

                {cnf.conflicting_train_number && (
                  <div className="text-xs font-mono text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Train #{cnf.conflicting_train_number} ({cnf.conflicting_train_name}) — Est. Delay: +{cnf.estimated_delay_minutes} min
                    </span>
                  </div>
                )}

                <p className="text-xs text-slate-300 font-sans leading-relaxed mb-3">
                  {cnf.resolution_suggestion}
                </p>

                <div className="flex items-center justify-between border-t border-control-border/60 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-control-muted">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Recommended Time Shift: <strong className="text-white">+{cnf.recommended_shift_minutes} mins</strong>
                    </span>
                  </div>

                  {isResolved ? (
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Auto-Sanctioned at Shifted Slot</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResolve(cnf)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Apply Time Shift & Deconflict</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

