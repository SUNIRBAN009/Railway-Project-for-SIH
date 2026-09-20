import React from 'react';
import { WhyNumberOne } from '../../services/api';
import { RiskColorChip } from './RiskColorChip';
import { Sparkles, AlertOctagon, MapPin, Grid, ArrowRight, ShieldAlert } from 'lucide-react';

interface WhyNumberOneCardProps {
  data: WhyNumberOne | null;
  onOpenRiskMatrix?: () => void;
  onDeclareEmergencyBlock?: (item: WhyNumberOne) => void;
  className?: string;
}

export const WhyNumberOneCard: React.FC<WhyNumberOneCardProps> = ({
  data,
  onOpenRiskMatrix,
  onDeclareEmergencyBlock,
  className = '',
}) => {
  if (!data) {
    return (
      <div className={`p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-mono">No Active Critical Flaws</h4>
            <p className="text-xs text-slate-400 mt-0.5">All monitored assets within safety parameters along this corridor.</p>
          </div>
        </div>
        {onOpenRiskMatrix && (
          <button
            onClick={onOpenRiskMatrix}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Open 5×5 Matrix</span>
          </button>
        )}
      </div>
    );
  }

  const isExtreme = data.category === 'EXTREME_RISK';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 shadow-xl transition-all ${
        isExtreme
          ? 'bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-rose-950/30 border-rose-500/60 shadow-rose-950/30'
          : 'bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-slate-900/80 border-amber-500/50 shadow-amber-950/20'
      } ${className}`}
    >
      {/* Background Decorative Glow */}
      <div
        className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isExtreme ? 'bg-rose-600/15' : 'bg-amber-500/10'
        }`}
      />

      <div className="relative z-10 space-y-3.5">
        {/* Header Row: Rank Badge & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-black tracking-wider uppercase border shadow-sm ${
                isExtreme
                  ? 'bg-rose-600 text-white border-rose-400 shadow-rose-900'
                  : 'bg-amber-600 text-white border-amber-400 shadow-amber-900'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>RANK #{data.rank} PRIORITY</span>
            </span>

            <span className="text-xs font-mono font-bold text-white/90">
              {data.defect_code}
            </span>

            <RiskColorChip
              category={data.category}
              score={data.final_risk_score}
              overdueDays={data.overdue_days}
              size="sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {onOpenRiskMatrix && (
              <button
                onClick={onOpenRiskMatrix}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Grid className="w-3.5 h-3.5 text-cyan-400" />
                <span>5×5 Matrix</span>
              </button>
            )}

            {onDeclareEmergencyBlock && (
              <button
                onClick={() => onDeclareEmergencyBlock(data)}
                className={`px-3 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition shadow-md ${
                  isExtreme
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 ring-1 ring-rose-400/50'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950'
                }`}
              >
                <span>Declare Emergency Block</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Location & Asset Details */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-bold text-white">{data.asset_tag}</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300 font-semibold">KM {data.location_km.toFixed(3)}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{data.corridor_code}</span>
        </div>

        {/* Explainable AI "Why #1?" Card Box */}
        <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 backdrop-blur-sm space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Explainable AI Prioritization Logic (#94)</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {data.rationale}
          </p>
        </div>

        {/* Action Footnote */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
          <span className="text-slate-400">
            Recommended Action: <strong className="text-amber-300 uppercase">{data.recommended_action}</strong>
          </span>
          <span className="text-slate-400">
            Escalated Aging Score: <strong className="text-white">{data.aging_score.toFixed(1)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
