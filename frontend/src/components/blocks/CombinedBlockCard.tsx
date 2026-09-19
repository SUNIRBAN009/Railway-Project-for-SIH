import React from 'react';
import { CombinedRecommendation } from '../../types';
import {
  Sparkles,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface CombinedBlockCardProps {
  recommendation: CombinedRecommendation;
  onAccept?: () => void;
  onInspect?: () => void;
  isCompact?: boolean;
}

export const CombinedBlockCard: React.FC<CombinedBlockCardProps> = ({
  recommendation,
  onAccept,
  onInspect,
  isCompact = false,
}) => {
  const [isAccepted, setIsAccepted] = React.useState(false);

  if (!recommendation || !recommendation.is_combined_candidate) {
    return null;
  }

  const handleAcceptClick = () => {
    setIsAccepted(true);
    if (onAccept) {
      onAccept();
    }
  };

  const depts = recommendation.departments || ['ENG', 'TRD'];
  const workTypes = recommendation.work_types || ['Track Tamping', 'OHE Tower Wagon'];
  const candidates = recommendation.candidate_blocks || [
    recommendation.primary_block_code || 'BLK-PRI-01',
    recommendation.secondary_block_code || 'BLK-SEC-02',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-blue-950/40 p-5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:shadow-cyan-900/30 space-y-4">
      {/* Background Accent Glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header Badge & Synergy Tier */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-inner">
            <Sparkles className="h-4 w-4 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase font-mono text-cyan-300">
                AI Combined Block Recommendation
              </span>
              <span className="rounded bg-cyan-900/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-200 border border-cyan-500/30">
                USP #98
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Cross-Departmental Synergy Optimization • PostGIS ST_Intersects Verified
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 px-3 py-1 text-xs font-mono font-bold text-emerald-300 shadow-sm">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>{recommendation.shadow_bundling_efficiency || '+50.0%'} EFFICIENT</span>
          </span>
          <span className="hidden sm:inline-block rounded-full bg-blue-950/80 border border-blue-500/50 px-2.5 py-1 text-[11px] font-mono font-semibold text-blue-300">
            {recommendation.synergy_tier || 'OPTIMAL_SHADOW_BUNDLE'}
          </span>
        </div>
      </div>

      {/* Cross-Departmental Pairing Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 rounded-xl bg-slate-950/60 border border-control-border p-3.5">
        {/* Primary Block */}
        <div className="md:col-span-5 rounded-lg border border-blue-500/30 bg-blue-950/20 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="rounded bg-blue-900/80 border border-blue-400 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-200">
              {depts[0] || 'ENG'} POSSESSION
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {candidates[0]}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200">{workTypes[0]}</div>
          <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
            <span>Spatial Overlap:</span>
            <strong>{recommendation.overlap_span_km?.toFixed(2) || '2.50'} KM</strong>
          </div>
        </div>

        {/* Center Linking Indicator */}
        <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-900/60 border border-cyan-400/50 text-cyan-300">
            <Share2 className="h-3.5 w-3.5 animate-spin-slow" />
          </div>
          <span className="text-[9px] font-mono text-cyan-400 mt-1 uppercase font-bold text-center">
            CO-ALLOC
          </span>
        </div>

        {/* Secondary Block */}
        <div className="md:col-span-5 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="rounded bg-amber-900/80 border border-amber-400 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-200">
              {depts[1] || 'TRD'} POSSESSION
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {candidates[1] || recommendation.secondary_block_code}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200">{workTypes[1]}</div>
          <div className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
            <span>25kV Traction Cut:</span>
            <strong>Power Synchronized</strong>
          </div>
        </div>
      </div>

      {/* Strategic Synergy Triad Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Capacity Saved */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900/50 border border-emerald-400 text-emerald-300">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Track Capacity Saved
            </span>
            <div className="text-lg font-black font-mono text-emerald-400">
              +{recommendation.track_capacity_saved_hours || 3.5} <span className="text-xs font-normal">Hours</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Passenger Delay Prevented */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-900/50 border border-cyan-400 text-cyan-300">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Train Delay Prevented
            </span>
            <div className="text-lg font-black font-mono text-cyan-400">
              ~{recommendation.train_delay_prevented_minutes || 140} <span className="text-xs font-normal">Mins</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Unified Window */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-900/50 border border-blue-400 text-blue-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Unified Window & Span
            </span>
            <div className="text-xs font-bold font-mono text-white truncate">
              {recommendation.unified_window || '02:30 to 06:00 IST'}
            </div>
            <div className="text-[10px] font-mono text-slate-300 truncate">
              {recommendation.unified_span_km || 'KM 142.500 to 146.200'}
            </div>
          </div>
        </div>
      </div>

      {/* AI Strategic Rationale Narrative */}
      {recommendation.ai_rationale && !isCompact && (
        <div className="rounded-xl border border-control-border bg-slate-950/80 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-400 uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AI Operational Proof & Safety Directive</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300 font-sans">
            {recommendation.ai_rationale}
          </p>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Eliminates duplicate 25kV OHE shutdowns across UP/DOWN lines.</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-control-border bg-control-bg hover:bg-control-border/50 text-slate-200 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Inspect GIS Overlap</span>
            </button>
          )}

          {isAccepted ? (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold shadow-lg shadow-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>SHADOW BUNDLE SYNCHRONIZED</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAcceptClick}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-cyan-900/40 flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              <span>Synchronize & Co-Sanction (USP #98)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
