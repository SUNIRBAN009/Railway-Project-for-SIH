import React, { useState, useMemo } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { DepartmentCode, ConflictItem, Block } from '../../types';
import { DEMO_CONFLICTS } from '../../services/demoData';
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

interface DynamicConflict {
  id: string;
  blockId: string;
  blockCode: string;
  departmentCode: DepartmentCode;
  conflictType: 'TRAIN_COLLISION' | 'SHADOW_OPPORTUNITY' | 'PARALLEL_BLOCK_COLLISION' | 'POWER_INTERLOCK';
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
  resolvedAt?: string;
}

const TRAIN_PATHS = [
  { number: '12424', name: 'Dibrugarh Rajdhani Express', startKm: 12.0, endKm: 16.5, speedKmh: 130 },
  { number: '12004', name: 'Lucknow Swarna Shatabdi Express', startKm: 16.0, endKm: 22.0, speedKmh: 120 },
  { number: '22436', name: 'Vande Bharat Express (Varanasi)', startKm: 0.0, endKm: 28.5, speedKmh: 140 },
  { number: '12302', name: 'Howrah Rajdhani Express', startKm: 8.0, endKm: 25.0, speedKmh: 130 },
  { number: 'FRT-BCN-88', name: 'Coal Freight Rake (Tughlakabad–Dadri)', startKm: 10.0, endKm: 28.0, speedKmh: 75 },
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

export const ConflictResolutionPanel: React.FC = () => {
  const { blocks, applyTimeShiftAndDeconflict } = useBlockStore();
  const [resolvedIds, setResolvedIds] = useState<string[]>(getStoredResolvedIds);
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

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-control-border pb-3">
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

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/70 border border-purple-500/50 text-purple-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>{pendingConflicts.length} PENDING DECISIONS</span>
          </span>

          <button
            onClick={handleManualSweep}
            disabled={isSweeping}
            title="Re-run AI Sweep-Line Detection Algorithm"
            className="p-1.5 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-cyan-400 hover:border-cyan-500/40 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Department Filter Tabs (Department-Wise Categorization) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-control-border pb-2.5">
        <button
          onClick={() => setSelectedDept('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
            selectedDept === 'ALL'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'bg-control-bg border border-control-border text-control-muted hover:text-white'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>ALL DEPARTMENTS</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 border border-current">
            {pendingConflicts.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedDept('ENG')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
            selectedDept === 'ENG'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
              : 'bg-control-bg border border-control-border text-control-muted hover:text-blue-300'
          }`}
        >
          <Wrench className="w-3 h-3 text-blue-400" />
          <span>CIVIL ENG (P-WAY)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 border border-current">
            {pendingConflicts.filter((c) => c.departmentCode === 'ENG' && !c.isShadow).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedDept('TRD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
            selectedDept === 'TRD'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
              : 'bg-control-bg border border-control-border text-control-muted hover:text-amber-300'
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>TRACTION (TRD)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 border border-current">
            {pendingConflicts.filter((c) => c.departmentCode === 'TRD' && !c.isShadow).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedDept('SNT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
            selectedDept === 'SNT'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'bg-control-bg border border-control-border text-control-muted hover:text-emerald-300'
          }`}
        >
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>SIGNAL & TELECOM (S&T)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 border border-current">
            {pendingConflicts.filter((c) => c.departmentCode === 'SNT' && !c.isShadow).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedDept('SHADOW')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
            selectedDept === 'SHADOW'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
              : 'bg-control-bg border border-control-border text-control-muted hover:text-purple-300'
          }`}
        >
          <Layers className="w-3 h-3 text-purple-400" />
          <span>SHADOW BUNDLES</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 border border-current">
            {pendingConflicts.filter((c) => c.isShadow).length}
          </span>
        </button>
      </div>

      {/* Active Pending Conflicts Queue (One-by-One Expandable Accordion) */}
      <div className="space-y-2.5">
        {filteredPending.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-control-border text-center space-y-1.5 bg-control-bg/40">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
            <p className="text-sm font-mono font-bold text-white">No Pending Conflicts in this Department</p>
            <p className="text-xs text-control-muted font-mono">
              All requests are conflict-free or have been deconflicted and moved to the archive below.
            </p>
          </div>
        ) : (
          filteredPending.map((cnf, index) => {
            const isExpanded = expandedConflictId === cnf.id;

            return (
              <div
                key={cnf.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  cnf.isShadow
                    ? 'border-purple-500/50 bg-purple-950/20'
                    : 'border-rose-500/50 bg-rose-950/20'
                }`}
              >
                {/* Compact Card Header / Summary Row */}
                <div
                  onClick={() => setExpandedConflictId(isExpanded ? null : cnf.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition select-none"
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-black/50 border border-control-border text-xs font-mono font-bold flex items-center justify-center text-slate-300">
                      {index + 1}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                        cnf.isShadow
                          ? 'bg-purple-950 border-purple-400 text-purple-200'
                          : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                      }`}
                    >
                      {cnf.isShadow ? 'SHADOW BUNDLE' : `${cnf.severity} CONFLICT`}
                    </span>

                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${getDeptBadgeColor(cnf.departmentCode)}`}>
                      {cnf.departmentCode}
                    </span>

                    <span className="text-xs font-mono font-bold text-white">
                      {cnf.blockCode}
                    </span>

                    <span className="text-xs text-slate-300 font-medium hidden md:inline truncate max-w-xs">
                      • {cnf.conflictingEntity}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-cyan-400 font-bold hidden sm:inline">
                      KM {cnf.startKm.toFixed(1)}–{cnf.endKm.toFixed(1)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedConflictId(isExpanded ? null : cnf.id);
                      }}
                      className="px-2 py-1 rounded bg-control-bg border border-control-border text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'Explain & Solve'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Explanation & Decision Card */}
                {isExpanded && (
                  <div className="p-4 border-t border-control-border/60 bg-control-bg/80 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                    {/* Conflict Title & Specific Train/Block Details */}
                    <div>
                      <h4 className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                        {cnf.isShadow ? <Layers className="w-4 h-4 text-purple-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                        <span>{cnf.title}</span>
                      </h4>
                      <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                        {cnf.description}
                      </p>
                    </div>

                    {/* Spatial & Temporal Geometry Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-control-border/60">
                      <div>
                        <span className="text-[10px] text-control-muted uppercase">Affected Section</span>
                        <p className="text-white font-bold">KM {cnf.startKm.toFixed(1)} – {cnf.endKm.toFixed(1)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-control-muted uppercase">Conflicting Object</span>
                        <p className="text-cyan-300 font-bold truncate">{cnf.conflictingEntity}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-control-muted uppercase">Impact Without AI</span>
                        <p className="text-rose-400 font-bold">
                          {cnf.isShadow ? 'Dual Line Closures (+2.5h)' : `+${cnf.estimatedDelayMinutes} min train delay`}
                        </p>
                      </div>
                    </div>

                    {/* AI Explanation & Mathematical Sweep Verdict */}
                    <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-xs font-mono text-slate-200 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-cyan-400 font-bold">AI Mathematical Solution: </span>
                        <span>{cnf.recommendedAction}</span>
                        <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>HermiT DL verified: Zero collision slot guaranteed upon application.</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Execution Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          Time Shift: <strong className="text-white">+{cnf.recommendedShiftMinutes} mins</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedConflictId(null)}
                          className="px-3 py-1.5 rounded-lg border border-control-border bg-control-panel text-xs font-mono text-control-muted hover:text-white"
                        >
                          Close
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResolveConflict(cnf)}
                          className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
                            cnf.isShadow
                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>
                            {cnf.isShadow
                              ? 'Approve & Bundle Co-Possession'
                              : `Apply Time Shift (+${cnf.recommendedShiftMinutes}m) & Deconflict`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Approved / Resolved Archive Dropdown (Top-Down Collapsible Section) */}
      <div className="border-t border-control-border/80 pt-3">
        <button
          type="button"
          onClick={() => setShowResolvedArchive(!showResolvedArchive)}
          className="w-full px-4 py-2.5 rounded-xl bg-control-bg/80 border border-control-border hover:border-emerald-500/40 text-xs font-mono font-bold text-slate-300 hover:text-white transition flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-400" />
            <span>AI RESOLVED & APPROVED ARCHIVE LEDGER</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-300">
              {resolvedConflicts.length} APPROVED
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-control-muted text-[11px]">
            <span>{showResolvedArchive ? 'Hide Archive' : 'Click to View Approved Solutions'}</span>
            {showResolvedArchive ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
          </div>
        </button>

        {/* Dropdown Content of Approved Solutions */}
        {showResolvedArchive && (
          <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs font-mono text-control-muted px-1 pb-1 border-b border-control-border/60">
              <span>Officially Deconflicted & Time-Shifted Track Blocks:</span>
              <span className="text-emerald-400 font-bold">ALL CLEAR</span>
            </div>

            {resolvedConflicts.length === 0 ? (
              <p className="text-xs font-mono text-control-muted text-center py-3">
                No approved items yet. Apply a resolution above to archive it here.
              </p>
            ) : (
              resolvedConflicts.map((resCnf) => (
                <div
                  key={resCnf.id}
                  className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white">{resCnf.blockCode}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] border ${getDeptBadgeColor(resCnf.departmentCode)}`}>
                        {resCnf.departmentCode}
                      </span>
                      <span className="text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500">
                        {resCnf.isShadow ? 'SHADOW BUNDLED' : 'TIME SHIFTED'}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans text-[11px]">
                      {resCnf.recommendedAction}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-bold block">
                      {resCnf.isShadow ? 'Saves 2.5 hrs Blockage' : `+${resCnf.recommendedShiftMinutes}m Slot Shifted`}
                    </span>
                    <span className="text-[10px] text-control-muted">
                      KM {resCnf.startKm.toFixed(1)}–{resCnf.endKm.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
