import React, { useState, useMemo } from 'react';
import { ConflictItem, Block } from '../../types';
import { useBlockStore } from '../../stores/blockStore';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Zap,
  Layers,
  RefreshCw,
  ShieldCheck,
  Radio,
  Wrench,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Filter,
  Archive,
  Info,
  ArrowRight,
} from 'lucide-react';

export interface DynamicConflict {
  id: string;
  blockId: string;
  blockCode: string;
  departmentCode: string;
  conflictType: string;
  title: string;
  description: string;
  startKm: number;
  endKm: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'OPPORTUNITY';
  conflictingEntity: string;
  estimatedDelayMinutes: number;
  recommendedShiftMinutes: number;
  recommendedAction: string;
  isShadow: boolean;
  status: 'PENDING' | 'RESOLVED';
}

type DepartmentCode = 'ENG' | 'TRD' | 'SNT' | 'ALL';

const TRAIN_PATHS = [
  { number: '12424', name: 'Dibrugarh Rajdhani Express', startKm: 14.0, endKm: 15.5, speedKmh: 130 },
  { number: '12004', name: 'Lucknow Swarna Shatabdi Express', startKm: 18.0, endKm: 21.5, speedKmh: 130 },
];

const STORAGE_RESOLVED_CONFLICTS_KEY = 'railway_resolved_conflicts_v3';

const getStoredResolvedIds = (): string[] => {
  try {
    const cached = localStorage.getItem(STORAGE_RESOLVED_CONFLICTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

interface ConflictResolutionPanelProps {
  block?: Block | null;
  onApplyResolution?: (conflictId: string, shiftMinutes: number) => void;
}

export const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  block,
  onApplyResolution,
}) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>(getStoredResolvedIds);
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

  // Merged Sweep-Line Variables
  const { blocks, applyTimeShiftAndDeconflict } = useBlockStore();
  const [selectedDept, setSelectedDept] = useState<'ALL' | 'ENG' | 'TRD' | 'SNT' | 'SHADOW'>('ALL');
  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null);
  const [showResolvedArchive, setShowResolvedArchive] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [lastSweepTime, setLastSweepTime] = useState<Date>(new Date());

  const markConflictResolved = (conflictId: string) => {
    setResolvedIds((prev) => {
      const next = prev.includes(conflictId) ? prev : [...prev, conflictId];
      try {
        localStorage.setItem(STORAGE_RESOLVED_CONFLICTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleManualSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      setLastSweepTime(new Date());
    }, 500);
  };

  // Continuous Dynamic AI Sweep-Line Evaluation
  const allConflicts = useMemo<DynamicConflict[]>(() => {
    const list: DynamicConflict[] = [];

    // Baseline demonstration conflict: TRD vs Rajdhani
    const blk002 = blocks.find((b) => b.id === 'blk-002' || b.block_code === 'BLK-TRD-OHE-02');
    if (blk002) {
      const isRes = resolvedIds.includes('cnf-blk-002') || blk002.status === 'COORDINATED';
      list.push({
        id: 'cnf-blk-002',
        blockId: blk002.id,
        blockCode: blk002.block_code,
        departmentCode: 'TRD',
        conflictType: 'TRAIN_COLLISION',
        title: 'Priority Train Path Intersect (12424 Dibrugarh Rajdhani)',
        description: '25kV Catenary inspection window overlaps with scheduled Rajdhani Express track slot between KM 14.0–15.5.',
        startKm: blk002.start_km || 14.0,
        endKm: blk002.end_km || 15.5,
        severity: 'CRITICAL',
        conflictingEntity: 'Train #12424 Dibrugarh Rajdhani Express',
        estimatedDelayMinutes: 38,
        recommendedShiftMinutes: 45,
        recommendedAction: 'Shift start by +45m to 02:45 IST after Rajdhani clears Ghaziabad junction.',
        isShadow: false,
        status: isRes ? 'RESOLVED' : 'PENDING',
      });
    }

    // Baseline demonstration conflict: ENG vs Shatabdi
    const blk004 = blocks.find((b) => b.id === 'blk-004' || b.block_code === 'BLK-ENG-BCM-04');
    if (blk004) {
      const isRes = resolvedIds.includes('cnf-blk-004') || blk004.status === 'COORDINATED';
      list.push({
        id: 'cnf-blk-004',
        blockId: blk004.id,
        blockCode: blk004.block_code,
        departmentCode: 'ENG',
        conflictType: 'TRAIN_COLLISION',
        title: 'High-Speed Headway Violation (12004 Lucknow Shatabdi)',
        description: 'Ballast cleaning operations at KM 18.0–21.5 cause adjacent line speed restriction during Shatabdi passage.',
        startKm: blk004.start_km || 18.0,
        endKm: blk004.end_km || 21.5,
        severity: 'MAJOR',
        conflictingEntity: 'Train #12004 Lucknow Swarna Shatabdi Express',
        estimatedDelayMinutes: 24,
        recommendedShiftMinutes: 60,
        recommendedAction: 'Shift block slot by +60m to 11:00 IST to ensure uninterrupted 130 km/h passage.',
        isShadow: false,
        status: isRes ? 'RESOLVED' : 'PENDING',
      });
    }

    // Sweep all newly submitted or updated blocks across departments
    for (let i = 0; i < blocks.length; i++) {
      const b1 = blocks[i];
      if (b1.id === 'blk-002' || b1.id === 'blk-004') continue;

      const b1Start = Number(b1.start_km) || 0;
      const b1End = Number(b1.end_km) || 0;
      const b1Span = `${b1Start.toFixed(1)}–${b1End.toFixed(1)}`;

      // A. Shadow Bundling Opportunities with overlapping departmental blocks
      for (let j = i + 1; j < blocks.length; j++) {
        const b2 = blocks[j];
        const b2Start = Number(b2.start_km) || 0;
        const b2End = Number(b2.end_km) || 0;

        const spatialOverlap = !(b1End + 1.5 < b2Start || b1Start - 1.5 > b2End);

        if (spatialOverlap && b1.department_code !== b2.department_code) {
          const shadowId = `shadow-${b1.id}-${b2.id}`;
          const isEligibleShadow =
            (b1.department_code === 'ENG' && b2.department_code === 'TRD') ||
            (b1.department_code === 'TRD' && b2.department_code === 'ENG') ||
            (b1.department_code === 'ENG' && b2.department_code === 'SNT') ||
            (b1.department_code === 'SNT' && b2.department_code === 'ENG');

          if (isEligibleShadow) {
            const isRes = resolvedIds.includes(shadowId) || b1.status === 'COORDINATED' || b2.status === 'COORDINATED';
            list.push({
              id: shadowId,
              blockId: b1.id,
              blockCode: b1.block_code,
              departmentCode: b1.department_code,
              conflictType: 'SHADOW_OPPORTUNITY',
              title: `Shadow Bundling: ${b1.department_code} + ${b2.department_code} Joint Possession`,
              description: `${b1.block_code} (${b1.department_code}) and ${b2.block_code} (${b2.department_code}) share KM span ${b1Span}. Bundling avoids a second separate track closure.`,
              startKm: Math.min(b1Start, b2Start),
              endKm: Math.max(b1End, b2End),
              severity: 'OPPORTUNITY',
              conflictingEntity: `${b2.department_code} Block ${b2.block_code}`,
              estimatedDelayMinutes: 0,
              recommendedShiftMinutes: 0,
              recommendedAction: `Synchronize ${b1.department_code} and ${b2.department_code} into a single coordinated window.`,
              isShadow: true,
              status: isRes ? 'RESOLVED' : 'PENDING',
            });
          }
        }
      }

      // B. Train timetable collision detection for pending/conflict blocks
      if (['PENDING_APPROVAL', 'CONFLICT_DETECTED', 'SUBMITTED', 'DRAFT'].includes(b1.status)) {
        const matchingTrain = TRAIN_PATHS.find(
          (tp) => !(b1End < tp.startKm || b1Start > tp.endKm)
        );

        if (matchingTrain) {
          const trainConflictId = `cnf-${b1.id}-train-${matchingTrain.number}`;
          const isRes = resolvedIds.includes(trainConflictId) || b1.status === 'COORDINATED';
          list.push({
            id: trainConflictId,
            blockId: b1.id,
            blockCode: b1.block_code,
            departmentCode: b1.department_code,
            conflictType: 'TRAIN_COLLISION',
            title: `Train Path Intersect (${matchingTrain.number} ${matchingTrain.name})`,
            description: `Requested possession for ${b1.block_code} at KM ${b1Span} intersects priority path of ${matchingTrain.name}.`,
            startKm: b1Start,
            endKm: b1End,
            severity: matchingTrain.speedKmh >= 130 ? 'CRITICAL' : 'MAJOR',
            conflictingEntity: `Train #${matchingTrain.number} (${matchingTrain.name})`,
            estimatedDelayMinutes: 30,
            recommendedShiftMinutes: 30,
            recommendedAction: `Shift start by +30m to safely clear path after train #${matchingTrain.number} departs.`,
            isShadow: false,
            status: isRes ? 'RESOLVED' : 'PENDING',
          });
        }
      }
    }

    return list;
  }, [blocks, resolvedIds]);

  // Separate Pending (active) and Resolved (archive)
  const pendingConflicts = useMemo(() => {
    return allConflicts.filter((c) => c.status === 'PENDING');
  }, [allConflicts]);

  const resolvedConflicts = useMemo(() => {
    return allConflicts.filter((c) => c.status === 'RESOLVED');
  }, [allConflicts]);

  // Filter pending items by selected department tab
  const filteredPending = useMemo(() => {
    if (selectedDept === 'ALL') return pendingConflicts;
    if (selectedDept === 'SHADOW') return pendingConflicts.filter((c) => c.isShadow);
    return pendingConflicts.filter((c) => c.departmentCode === selectedDept && !c.isShadow);
  }, [pendingConflicts, selectedDept]);

  // Handle resolution action
  const handleResolveConflict = async (conflict: DynamicConflict) => {
    markConflictResolved(conflict.id);
    if (expandedConflictId === conflict.id) {
      setExpandedConflictId(null);
    }

    if (conflict.isShadow) {
      await applyTimeShiftAndDeconflict(
        conflict.blockId,
        0,
        `Co-allocated shadow possession bundled with ${conflict.conflictingEntity}. Unified window verified.`
      );
    } else {
      await applyTimeShiftAndDeconflict(
        conflict.blockId,
        conflict.recommendedShiftMinutes,
        `Shifted +${conflict.recommendedShiftMinutes}m to deconflict from ${conflict.conflictingEntity}.`
      );
    }
  };

  const handleResolve = async (cnf: ConflictItem) => {
    markConflictResolved(cnf.id);
    if (onApplyResolution) {
      onApplyResolution(cnf.id, cnf.recommended_shift_minutes);
    }
    if (block?.id) {
      await applyTimeShiftAndDeconflict(
        block.id,
        cnf.recommended_shift_minutes,
        `Shifted +${cnf.recommended_shift_minutes}m to deconflict from ${cnf.conflicting_train_name || 'train'}.`
      );
    }
  };

  const getDeptBadgeColor = (dept: DepartmentCode | string) => {
    switch (dept) {
      case 'ENG':
        return 'text-blue-400 border-blue-500/50 bg-blue-950/40';
      case 'TRD':
        return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
      case 'SNT':
        return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
      default:
        return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
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
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-control-border pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white tracking-wide">
              AI Sweep-Line Conflict Resolution & Shadow Bundling Engine
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Automated collision detection & multi-department possession bundling (One-by-One Explainable View)
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

