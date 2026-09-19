import React, { useState, useEffect } from 'react';
import { Block, BlockConflict, CombinedRecommendation, Train } from '../../types';
import { DEMO_TRAINS } from '../../services/demoData';
import { useLiveBlocks } from '../../hooks/useLiveBlocks';
import { blockService } from '../../services/api';
import { CombinedBlockCard } from './CombinedBlockCard';
import {
  Clock,
  Train as TrainIcon,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Layers,
  Zap,
  CheckCircle2,
  Filter,
  X,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface BlockTimelineProps {
  corridorCode?: string;
  blocks?: Block[];
  onSelectBlock?: (block: Block) => void;
}

export const BlockTimeline: React.FC<BlockTimelineProps> = ({
  corridorCode = 'NDLS-CNB-MAIN',
  blocks: propBlocks,
  onSelectBlock,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'NIGHT' | 'FULL'>('NIGHT');
  const { blocks: fetchedBlocks } = useLiveBlocks();
  const liveBlocks = propBlocks && propBlocks.length > 0 ? propBlocks : fetchedBlocks;

  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [corridorRecs, setCorridorRecs] = useState<CombinedRecommendation[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CONFLICTS' | 'SHADOW'>('ALL');

  // Load corridor-wide AI Combined Recommendations (USP #98)
  useEffect(() => {
    let isMounted = true;
    blockService
      .getCorridorRecommendations(corridorCode)
      .then((data) => {
        if (isMounted && data && Array.isArray(data)) {
          setCorridorRecs(data);
        }
      })
      .catch(() => {
        // Fallback default recommendation if network offline
        if (isMounted) {
          setCorridorRecs([
            {
              is_combined_candidate: true,
              primary_block_code: 'BLK-20260920-ENG-001',
              secondary_block_code: 'BLK-20260920-TRD-002',
              candidate_blocks: ['BLK-20260920-ENG-001', 'BLK-20260920-TRD-002'],
              departments: ['ENG', 'TRD'],
              work_types: ['Track Tamping (CSM Machine)', '25kV OHE Tower Wagon Inspection'],
              overlap_span_km: 2.5,
              overlap_start_km: 143.0,
              overlap_end_km: 145.5,
              unified_span_km: 'KM 142.500 to KM 146.200',
              unified_window: '02:30 to 06:00 IST',
              track_capacity_saved_hours: 3.5,
              train_delay_prevented_minutes: 140,
              shadow_bundling_efficiency: '+87.5%',
              synergy_tier: 'OPTIMAL_SHADOW_BUNDLE',
              ai_rationale:
                'AI Synergy Engine (USP #98): Synchronizing TRD (25kV OHE Tower Wagon Inspection) with ENG (Track Tamping (CSM Machine)) under a shared 25kV OHE de-energization possession eliminates duplicate track downtime, saving 3.5 hours of line capacity and preventing ~140 minutes of train delay.',
              status: 'COORDINATED',
            },
          ]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [corridorCode]);

  // Timeline hours
  // NIGHT: 00:00 to 06:00 (Prime Indian Railways maintenance window)
  // FULL: 00:00 to 24:00
  const hours = selectedTimeRange === 'NIGHT'
    ? [0, 1, 2, 3, 4, 5, 6]
    : Array.from({ length: 25 }, (_, i) => i);

  const startHour = hours[0];
  const totalHours = hours[hours.length - 1] - startHour;

  const getPositionPercent = (timeStr: string) => {
    let hour = 0;
    let min = 0;
    if (timeStr && timeStr.includes('T')) {
      const timePart = timeStr.split('T')[1];
      const parts = timePart.split(':');
      hour = parseInt(parts[0], 10) || 0;
      min = parseInt(parts[1], 10) || 0;
    } else if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      hour = parseInt(parts[0], 10) || 0;
      min = parseInt(parts[1], 10) || 0;
    }
    const fractionalHour = hour + min / 60;
    const clamped = Math.max(startHour, Math.min(hours[hours.length - 1], fractionalHour));
    return ((clamped - startHour) / totalHours) * 100;
  };

  const handleBlockClick = (b: Block) => {
    setSelectedBlock((prev) => (prev?.id === b.id ? null : b));
    if (onSelectBlock) {
      onSelectBlock(b);
    }
  };

  // Scheduled demo train paths during 00:00 - 06:00
  const trainSchedules = [
    {
      train: DEMO_TRAINS[0], // 12424 Rajdhani
      passTime: '02:15',
      durationMinutes: 20,
      corridor: 'NDLS-CNB-MAIN',
      color: 'bg-rose-600/90 border-rose-400 text-white',
      priority: 'PRIORITY 1',
    },
    {
      train: DEMO_TRAINS[1], // 12004 Shatabdi
      passTime: '05:30',
      durationMinutes: 20,
      corridor: 'NDLS-CNB-MAIN',
      color: 'bg-amber-500/90 border-amber-400 text-white',
      priority: 'PRIORITY 2',
    },
    {
      train: DEMO_TRAINS[3], // BCN Freight
      passTime: '01:00',
      durationMinutes: 35,
      corridor: 'NDLS-CNB-MAIN',
      color: 'bg-slate-700/90 border-slate-500 text-slate-200',
      priority: 'FREIGHT',
    },
  ];

  // Filtering blocks by active category
  const filteredBlocks = liveBlocks.filter((b) => {
    if (activeFilter === 'CONFLICTS') {
      return b.status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0);
    }
    if (activeFilter === 'SHADOW') {
      return b.status === 'COORDINATED' || b.combined_recommendation?.is_combined_candidate;
    }
    return true;
  });

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-2xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-control-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold font-mono text-white tracking-tight">
              Corridor Possession Gantt & Sweep-Line Deconfliction
            </h3>
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300">
              POSTGIS ACTIVE
            </span>
          </div>
          <p className="text-xs text-control-muted mt-1 font-mono">
            Trunk Corridor: <span className="text-cyan-400 font-bold">{corridorCode}</span> • Interactive 24-hr Time Occupancy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex rounded-lg border border-control-border bg-control-bg p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${
                activeFilter === 'ALL'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              All Lanes
            </button>
            <button
              onClick={() => setActiveFilter('SHADOW')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                activeFilter === 'SHADOW'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Shadow Bundles</span>
            </button>
            <button
              onClick={() => setActiveFilter('CONFLICTS')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                activeFilter === 'CONFLICTS'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Conflicts Only</span>
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="flex rounded-lg border border-control-border bg-control-bg p-0.5 text-xs font-mono">
            <button
              onClick={() => setSelectedTimeRange('NIGHT')}
              className={`px-3 py-1 rounded-md transition ${
                selectedTimeRange === 'NIGHT'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              Night (00:00 – 06:00)
            </button>
            <button
              onClick={() => setSelectedTimeRange('FULL')}
              className={`px-3 py-1 rounded-md transition ${
                selectedTimeRange === 'FULL'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              24-Hr Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Interactive Status Bar */}
      <div className="flex items-center justify-between gap-4 text-xs font-mono flex-wrap bg-control-bg/80 p-3 rounded-xl border border-control-border">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-control-muted font-bold text-[10px] uppercase">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400 inline-block" />
            <span>ENG Track Tamping</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-600 border border-amber-400 inline-block" />
            <span>TRD 25kV OHE Cutoff</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400 inline-block" />
            <span>S&T Signals (Shadow Bundled)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 border border-rose-400 inline-block" />
            <span>Prestige Train Path</span>
          </span>
        </div>

        <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any block on the Gantt to inspect spatial-temporal overlap & AI synergy</span>
        </div>
      </div>

      {/* Gantt Canvas */}
      <div className="space-y-6 pt-2">
        {/* Timeline Header Ruler */}
        <div className="relative h-7 border-b border-control-border text-[11px] font-mono text-control-muted">
          {hours.map((h, i) => (
            <div
              key={h}
              style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
              className="absolute -translate-x-1/2 flex flex-col items-center"
            >
              <span>{String(h).padStart(2, '0')}:00</span>
              <div className="h-2 w-px bg-control-border" />
            </div>
          ))}
        </div>

        {/* Lane 1: Civil Engineering (ENG) Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-blue-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span>LANE 1: Civil Engineering (Track Maintenance & Tamping)</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-950 text-[10px] text-blue-300 border border-blue-500/40">
                P-WAY
              </span>
            </span>
            <span className="text-[10px] text-control-muted">DOWN MAIN LINE</span>
          </div>

          <div className="relative h-14 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {/* Hour grid lines */}
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/30 pointer-events-none"
              />
            ))}

            {filteredBlocks
              .filter((b) => b.department_code === 'ENG')
              .map((b) => {
                const startPos = getPositionPercent(b.scheduled_start_time);
                const endPos = getPositionPercent(b.scheduled_end_time);
                const width = Math.max(endPos - startPos, 7);
                const isSelected = selectedBlock?.id === b.id;
                const hasConflicts = b.status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0);
                const isCoordinated = b.status === 'COORDINATED';

                return (
                  <div
                    key={b.id}
                    onClick={() => handleBlockClick(b)}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-lg border text-white p-1.5 text-xs font-mono shadow-lg flex items-center justify-between overflow-hidden cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 scale-[1.02] z-30 brightness-125'
                        : 'hover:brightness-110'
                    } ${
                      isCoordinated
                        ? 'bg-gradient-to-r from-blue-700 to-emerald-700 border-emerald-400'
                        : hasConflicts
                        ? 'bg-gradient-to-r from-blue-800 to-rose-800 border-rose-400'
                        : 'bg-blue-600/90 border-blue-400'
                    }`}
                    title={`${b.block_code} (${b.equipment_required || 'GANG'}) | KM ${Number(b.start_km).toFixed(1)}-${Number(b.end_km).toFixed(1)}`}
                  >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold truncate">{b.block_code}</span>
                        {isCoordinated && (
                          <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[9px] font-black border border-emerald-400 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>#98</span>
                          </span>
                        )}
                        {hasConflicts && !isCoordinated && (
                          <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] font-black border border-rose-400 animate-pulse">
                            ⚠️ CONFLICT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-85 block truncate">
                        {b.work_type} (KM {Number(b.start_km).toFixed(1)}–{Number(b.end_km).toFixed(1)})
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-300 shrink-0 hidden md:inline">
                      {b.status}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Lane 2: Traction Distribution (TRD) Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span>LANE 2: Electrical Traction (25kV OHE Isolation & Catenary)</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-[10px] text-amber-300 border border-amber-500/40">
                25kV CUTOFF
              </span>
            </span>
            <span className="text-[10px] text-control-muted">POWER ISOLATION</span>
          </div>

          <div className="relative h-14 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/30 pointer-events-none"
              />
            ))}

            {filteredBlocks
              .filter((b) => b.department_code === 'TRD')
              .map((b) => {
                const startPos = getPositionPercent(b.scheduled_start_time);
                const endPos = getPositionPercent(b.scheduled_end_time);
                const width = Math.max(endPos - startPos, 7);
                const isSelected = selectedBlock?.id === b.id;
                const hasConflicts = b.status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0);
                const isCoordinated = b.status === 'COORDINATED';

                return (
                  <div
                    key={b.id}
                    onClick={() => handleBlockClick(b)}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-lg border text-white p-1.5 text-xs font-mono shadow-lg flex items-center justify-between overflow-hidden cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 scale-[1.02] z-30 brightness-125'
                        : 'hover:brightness-110'
                    } ${
                      isCoordinated
                        ? 'bg-gradient-to-r from-amber-700 to-emerald-700 border-emerald-400'
                        : hasConflicts
                        ? 'bg-gradient-to-r from-amber-800 to-rose-800 border-rose-400'
                        : 'bg-amber-600/90 border-amber-400'
                    }`}
                    title={`${b.block_code} (${b.equipment_required || 'TOWER WAGON'}) | 25kV Cutoff`}
                  >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold truncate">{b.block_code}</span>
                        {isCoordinated && (
                          <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[9px] font-black border border-emerald-400 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>#98 SYNERGY</span>
                          </span>
                        )}
                        {hasConflicts && !isCoordinated && (
                          <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] font-black border border-rose-400 animate-pulse">
                            ⚠️ OVERLAP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-85 block truncate">
                        {b.work_type} (25kV Off)
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-300 shrink-0 hidden md:inline">
                      {b.status}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Lane 3: Signal & Telecom (S&T) Shadow Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span>LANE 3: Signal & Telecom (Interlocking, Point Machines & Axle Counters)</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-[10px] text-emerald-300 border border-emerald-500/40">
                SHADOW BUNDLED
              </span>
            </span>
            <span className="text-[10px] text-emerald-300 font-normal">ZERO ADDITIONAL TRACK DETENTION</span>
          </div>

          <div className="relative h-14 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/30 pointer-events-none"
              />
            ))}

            {filteredBlocks
              .filter((b) => b.department_code === 'SNT')
              .map((b) => {
                const startPos = getPositionPercent(b.scheduled_start_time);
                const endPos = getPositionPercent(b.scheduled_end_time);
                const width = Math.max(endPos - startPos, 7);
                const isSelected = selectedBlock?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => handleBlockClick(b)}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-lg border text-white p-1.5 text-xs font-mono shadow-lg flex items-center justify-between overflow-hidden cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 scale-[1.02] z-30 brightness-125'
                        : 'hover:brightness-110'
                    } bg-emerald-600/90 border-emerald-400`}
                    title={`${b.block_code} | Interlocking Overhaul`}
                  >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold truncate">{b.block_code}</span>
                        <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[9px] font-black border border-emerald-300">
                          SHADOW
                        </span>
                      </div>
                      <span className="text-[10px] opacity-85 block truncate">
                        {b.work_type} (Point Overhaul)
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-300 shrink-0 hidden md:inline">
                      {b.status}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Lane 4: Commercial Train Timetable Schedules (Prestige Trains) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
            <span className="flex items-center gap-1.5">
              <span>LANE 4: Commercial Train Paths & Collision Detection</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-[10px] text-rose-300 border border-rose-500/40">
                TIMETABLE PATHS
              </span>
            </span>
            <span className="text-[10px] text-control-muted">REAL-TIME CONFLICT RADAR</span>
          </div>

          <div className="relative h-14 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/30 pointer-events-none"
              />
            ))}

            {trainSchedules.map((ts, idx) => (
              <div
                key={idx}
                style={{
                  left: `${getPositionPercent(ts.passTime)}%`,
                  width: '9%',
                }}
                className={`absolute top-1.5 bottom-1.5 rounded-lg border p-1 text-xs font-mono shadow-lg flex items-center justify-between cursor-pointer hover:scale-105 transition-transform ${ts.color}`}
                title={`Train #${ts.train.train_number} - ${ts.train.train_name} | Scheduled Pass: ${ts.passTime}`}
              >
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <TrainIcon className="w-3 h-3 text-white" />
                    <span className="font-black text-[10px]">#{ts.train.train_number}</span>
                  </div>
                  <span className="text-[9px] opacity-90 block truncate font-sans">
                    {ts.train.train_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Detail Drawer / AI Combined Block Recommendation Area */}
      {selectedBlock && (
        <div className="rounded-xl border border-cyan-500/40 bg-slate-950/80 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-control-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h4 className="text-sm font-extrabold font-mono text-white">
                Selected Possession Details: <span className="text-cyan-400">{selectedBlock.block_code}</span>
              </h4>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                {selectedBlock.department_code} • {selectedBlock.work_type}
              </span>
            </div>

            <button
              onClick={() => setSelectedBlock(null)}
              className="p-1 rounded-lg hover:bg-control-border text-control-muted hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* If the selected block has an AI Combined Recommendation (USP #98), display the card! */}
          {selectedBlock.combined_recommendation?.is_combined_candidate && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>AI Combined Block Bundle Active for this Possession:</span>
              </div>
              <CombinedBlockCard
                recommendation={selectedBlock.combined_recommendation}
                onAccept={() => {
                  // Mark as synchronized
                }}
              />
            </div>
          )}

          {/* Detected Conflicts Summary */}
          {selectedBlock.conflicts && selectedBlock.conflicts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-control-border/50">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Detected Spatial-Temporal Conflicts ({selectedBlock.conflicts.length})</span>
                </span>
                <span className="text-[11px] text-control-muted">
                  Safety Margin: 1.5 KM Braking Distance Buffer
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {selectedBlock.conflicts.map((cnf, i) => (
                  <div
                    key={cnf.id || i}
                    className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                      cnf.resolution_status === 'SHADOW_MERGED'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        {cnf.resolution_status === 'SHADOW_MERGED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{cnf.conflicting_entity_label || cnf.conflicting_entity_id}</span>
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          cnf.resolution_status === 'SHADOW_MERGED'
                            ? 'bg-emerald-950 border border-emerald-400 text-emerald-300'
                            : 'bg-rose-950 border border-rose-400 text-rose-300'
                        }`}
                      >
                        {cnf.resolution_status}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-90">
                      Span: KM {Number(cnf.overlap_start_km).toFixed(1)} to KM {Number(cnf.overlap_end_km).toFixed(1)}
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1">
                      {cnf.resolution_notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prominent Corridor-wide AI Combined Block Recommendation Card (USP #98) */}
      {!selectedBlock && corridorRecs.length > 0 && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-black font-mono uppercase tracking-wider text-cyan-300">
                Corridor Synergy Engine: Top AI Combined Block Candidate
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {corridorRecs.length} Synergistic Bundles Identified
            </span>
          </div>

          <CombinedBlockCard
            recommendation={corridorRecs[0]}
            onAccept={() => {
              // Trigger sync
            }}
          />
        </div>
      )}
    </div>
  );
};
