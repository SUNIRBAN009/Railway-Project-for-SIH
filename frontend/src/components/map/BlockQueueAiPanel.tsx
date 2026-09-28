import React, { useState } from 'react';
import { Block } from '../../types';
import {
  Layers,
  AlertTriangle,
  Clock,
  Sparkles,
  CloudRain,
  Wind,
  Thermometer,
  ShieldAlert,
  ChevronRight,
  Zap,
  Wrench,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface BlockQueueAiPanelProps {
  blocks: Block[];
  onSelectBlock?: (block: Block) => void;
}

export const BlockQueueAiPanel: React.FC<BlockQueueAiPanelProps> = ({
  blocks,
  onSelectBlock,
}) => {
  const [isMerged, setIsMerged] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  const pendingCount = blocks.filter(
    (b) => b.status === 'SUBMITTED' || b.status === 'PENDING_APPROVAL'
  ).length || 35;

  const activeCount = blocks.filter((b) => b.status === 'ACTIVE').length || 12;

  const conflictCount = blocks.filter(
    (b) => b.status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0)
  ).length || 12;

  const coordinatedCount = blocks.filter(
    (b) => b.status === 'COORDINATED' || b.status === 'SANCTIONED'
  ).length || 44;

  const emergencyCount = 7;

  const handleCardClick = (statusType: string) => {
    setActiveCategoryFilter(statusType);
    const found = blocks.find((b) => {
      if (statusType === 'ACTIVE') return b.status === 'ACTIVE';
      if (statusType === 'CONFLICT') return b.status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0);
      if (statusType === 'PENDING') return b.status === 'SUBMITTED' || b.status === 'PENDING_APPROVAL';
      return b.status === 'SANCTIONED';
    });
    if (found && onSelectBlock) {
      onSelectBlock(found);
    }
  };

  const handleApplyMerge = () => {
    setIsMerged(true);
    const demoBlock = blocks.find((b) => b.block_code?.includes('TRD') || b.block_code?.includes('ENG')) || blocks[0];
    if (demoBlock && onSelectBlock) {
      onSelectBlock(demoBlock);
    }
  };

  const handleAcceptSplit = () => {
    setIsSplit(true);
    const sntBlock = blocks.find((b) => (b.department_code || '').toUpperCase() === 'SNT') || blocks[0];
    if (sntBlock && onSelectBlock) {
      onSelectBlock(sntBlock);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-control-border font-mono select-none overflow-y-auto divide-y divide-slate-800/80 custom-scrollbar">
      {/* ------------------------------------------------------------- */}
      {/* 1. BLOCK QUEUE SUMMARY                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 bg-slate-900/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black tracking-wide text-white uppercase">
              Block Queue
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            {blocks.length || 127} TOTAL
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Pending AI Review */}
          <button
            type="button"
            onClick={() => handleCardClick('PENDING')}
            className={`p-2 rounded-xl text-left transition ${
              activeCategoryFilter === 'PENDING'
                ? 'bg-amber-900/60 border border-amber-400 ring-1 ring-amber-400'
                : 'bg-amber-950/40 border border-amber-500/40 hover:bg-amber-950/70'
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 mb-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-base font-black">{pendingCount}</span>
            </div>
            <span className="text-[9px] text-amber-300 font-bold block uppercase">
              Pending AI
            </span>
          </button>

          {/* Active Occupations */}
          <button
            type="button"
            onClick={() => handleCardClick('ACTIVE')}
            className={`p-2 rounded-xl text-left transition ${
              activeCategoryFilter === 'ACTIVE'
                ? 'bg-rose-900/60 border border-rose-400 ring-1 ring-rose-400'
                : 'bg-rose-950/40 border border-rose-500/40 hover:bg-rose-950/70'
            }`}
          >
            <div className="flex items-center justify-between text-rose-400 mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-base font-black">{activeCount}</span>
            </div>
            <span className="text-[9px] text-rose-300 font-bold block uppercase">
              Active Blocks
            </span>
          </button>

          {/* AI Conflicts */}
          <button
            type="button"
            onClick={() => handleCardClick('CONFLICT')}
            className={`p-2 rounded-xl text-left transition ${
              activeCategoryFilter === 'CONFLICT'
                ? 'bg-red-900/60 border border-red-400 ring-1 ring-red-400'
                : 'bg-red-950/40 border border-red-500/40 hover:bg-red-950/70'
            } animate-pulse`}
          >
            <div className="flex items-center justify-between text-red-400 mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-base font-black">{conflictCount}</span>
            </div>
            <span className="text-[9px] text-red-300 font-bold block uppercase">
              Conflicts
            </span>
          </button>

          {/* Emergency Defect Closures */}
          <button
            type="button"
            onClick={() => handleCardClick('EMERGENCY')}
            className={`p-2 rounded-xl text-left transition ${
              activeCategoryFilter === 'EMERGENCY'
                ? 'bg-purple-900/60 border border-purple-400 ring-1 ring-purple-400'
                : 'bg-purple-950/40 border border-purple-500/40 hover:bg-purple-950/70'
            }`}
          >
            <div className="flex items-center justify-between text-purple-400 mb-0.5">
              <Wrench className="w-3.5 h-3.5" />
              <span className="text-base font-black">{emergencyCount}</span>
            </div>
            <span className="text-[9px] text-purple-300 font-bold block uppercase">
              Emergency
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. AI DECONFLICTION & SYNERGY SUGGESTIONS                     */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Sparkles className="w-4 h-4" />
          <h4 className="text-xs font-black tracking-wide text-white uppercase">
            AI Suggestions
          </h4>
        </div>

        {/* Suggestion 1: Co-Possession (USP #98) */}
        <div
          onClick={handleApplyMerge}
          className={`p-2.5 rounded-xl border space-y-1.5 transition cursor-pointer ${
            isMerged
              ? 'bg-emerald-950/50 border-[#00CC44] ring-1 ring-emerald-400'
              : 'bg-cyan-950/40 border-cyan-500/40 hover:border-cyan-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-900 border border-cyan-400 text-cyan-200">
              CO-POSSESSION (USP #98)
            </span>
            <span className="text-[9px] font-bold text-emerald-400">
              Save 2.5 hrs
            </span>
          </div>
          <p className="text-[11px] text-slate-200 font-sans font-medium leading-snug">
            ENG Track Tamping + TRD OHE wire adjustment can merge under shared 25kV power cutoff at <strong>KM 13.0–15.5</strong>.
          </p>
          <div className="flex items-center justify-between text-[9px] text-control-muted pt-1 border-t border-cyan-900/60">
            <span>Window: 07:15 – 09:45 IST</span>
            {isMerged ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> MERGED
              </span>
            ) : (
              <span className="text-cyan-300 font-bold hover:underline">Apply Merge &rarr;</span>
            )}
          </div>
        </div>

        {/* Suggestion 2: Time-Split Recommendation */}
        <div
          onClick={handleAcceptSplit}
          className={`p-2.5 rounded-xl border space-y-1.5 transition cursor-pointer ${
            isSplit
              ? 'bg-emerald-950/50 border-[#00CC44] ring-1 ring-emerald-400'
              : 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-900 border border-purple-400 text-purple-200">
              TIME-SPLIT OPTIMIZATION
            </span>
            <span className="text-[9px] font-bold text-cyan-300">
              0 Delays
            </span>
          </div>
          <p className="text-[11px] text-slate-200 font-sans font-medium leading-snug">
            Split 4-hour S&T interlocking block at Aligarh into two 2-hour slots to allow Rajdhani #12424 unhindered passage.
          </p>
          <div className="flex items-center justify-between text-[9px] text-control-muted pt-1 border-t border-purple-900/60">
            <span>Passage Clearance: 100%</span>
            {isSplit ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> OPTIMIZED
              </span>
            ) : (
              <span className="text-purple-300 font-bold hover:underline">Accept Split &rarr;</span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. WEATHER & OPERATIONAL SAFETY ALERTS                        */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 space-y-2 bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400">
            <CloudRain className="w-4 h-4" />
            <h4 className="text-xs font-black tracking-wide text-white uppercase">
              Weather & Track
            </h4>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold">LIVE SYNC</span>
        </div>

        {/* Weather Status 1: Rain */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-cyan-400" />
              Rain Activity (85%)
            </span>
            <span className="text-amber-400 font-bold">Section GZB–ALJN</span>
          </div>
          <div className="text-control-muted">
            Wet rail condition. Caution order 75 km/h recommended for heavy freight.
          </div>
        </div>

        {/* Weather Status 2: Fog & Visibility */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <Wind className="w-3 h-3 text-slate-400" />
              Fog Visibility: Low
            </span>
            <span className="text-emerald-400 font-bold">Detonators Ready</span>
          </div>
          <div className="text-control-muted">
            Distance visibility &lt; 200m. Fog safety devices primed across Tundla yard.
          </div>
        </div>

        {/* Weather Status 3: Track Rail Temperature */}
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-rose-400" />
              Rail Temperature: 42°C
            </span>
            <span className="text-emerald-400 font-bold">Normal Envelope</span>
          </div>
          <div className="text-control-muted">
            Stress-free temperature within 38°C–52°C range. Buckling risk: LOW.
          </div>
        </div>
      </div>
    </div>
  );
};
