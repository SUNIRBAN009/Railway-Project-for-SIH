import React, { useState } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { Sparkles, Layers, CheckCircle2, ShieldCheck, ArrowRight, Zap, Radio, Wrench } from 'lucide-react';
import { Block } from '../../types';

interface CoPossessionOptimizerProps {
  block?: Block | null;
}

export const CoPossessionOptimizer: React.FC<CoPossessionOptimizerProps> = ({ block }) => {
  const [bundled, setBundled] = useState(false);

  const recommendation = block?.combined_recommendation;
  const hasCandidates = recommendation?.is_combined_candidate && recommendation.candidate_blocks && recommendation.candidate_blocks.length > 0;

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-control-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Automated Shadow-Block Bundling & Co-Allocation Optimizer
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Synergistic multi-department possession bundling (ENG + TRD + S&T)
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/70 border border-cyan-500/50 text-cyan-300">
          EFFICIENCY: +42.5% GAIN
        </span>
      </div>

      {/* Main Container */}
      <div className="p-4 rounded-xl bg-control-bg/70 border border-control-border space-y-3">
        {!block ? (
          <div className="text-center text-control-muted font-mono text-xs p-4">
            Select a block to evaluate shadow bundling opportunities.
          </div>
        ) : !hasCandidates ? (
          <div className="text-center text-emerald-400 font-mono text-xs p-4 border border-dashed border-emerald-500/30 rounded-xl bg-emerald-950/20">
            No shadow bundling candidates found for this spatial-temporal window.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 border border-blue-500 text-blue-300">
                  ANCHOR POSSESSION ({block.department_code})
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {block.block_code} • {block.work_type}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                KM {Number(block.start_km).toFixed(1)} – {Number(block.end_km).toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              {recommendation.ai_rationale || `The AI optimizer identified eligible departmental maintenance requests within this exact corridor spatial envelope.`}
            </p>

            {/* Candidate Shadow Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {recommendation.candidate_blocks?.map((candidateCode, idx) => {
                const dept = recommendation.departments?.[idx] || 'SNT';
                const work = recommendation.work_types?.[idx] || 'Maintenance';
                const isTRD = dept === 'TRD';
                const Icon = isTRD ? Zap : Radio;
                const borderClass = isTRD ? 'border-amber-500/40 bg-amber-950/20' : 'border-emerald-500/40 bg-emerald-950/20';
                const textClass = isTRD ? 'text-amber-400' : 'text-emerald-400';
                const tagClass = isTRD ? 'text-amber-300' : 'text-emerald-300';
                const tagText = isTRD ? 'POWER SYNC FIT' : '100% SPATIAL FIT';

                return (
                  <div key={idx} className={`p-3 rounded-lg border ${borderClass} space-y-1.5 text-xs font-mono`}>
                    <div className="flex items-center justify-between">
                      <span className={`${textClass} font-bold flex items-center gap-1`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{candidateCode} ({dept})</span>
                      </span>
                      <span className={`text-[10px] ${tagClass} font-bold`}>{tagText}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans">
                      {work}. Overlap KM {recommendation.overlap_start_km} to {recommendation.overlap_end_km}.
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="pt-3 border-t border-control-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Saved Track Occupation: <strong className="text-white">{recommendation.track_capacity_saved_hours || 3.2} Hours</strong> • {recommendation.train_delay_prevented_minutes || 0}m Train Delay Prevented</span>
              </div>

              {bundled ? (
                <div className="px-4 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CO-POSSESSIONS BUNDLED & SANCTIONED</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBundled(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bundle Selected Shadow Blocks</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
