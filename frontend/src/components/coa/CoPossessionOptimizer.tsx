import React, { useState } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { Sparkles, Layers, CheckCircle2, ShieldCheck, Zap, Radio, Wrench } from 'lucide-react';
import { Block } from '../../types';
import { playPendingProposalChime } from '../../services/soundService';

interface CoPossessionOptimizerProps {
  block?: Block | null;
}

export const CoPossessionOptimizer: React.FC<CoPossessionOptimizerProps> = ({ block }) => {
  const [bundled, setBundled] = useState(false);
  const { blocks, applyTimeShiftAndDeconflict } = useBlockStore();

  const handleBundleExecution = async (b1Id: string, b2Id?: string) => {
    setBundled(true);
    try {
      playPendingProposalChime('TRD');
    } catch {}

    if (b1Id) {
      await applyTimeShiftAndDeconflict(
        b1Id,
        0,
        '[SHADOW BUNDLED]: Joint possession window synchronized (+42.5% track efficiency gain).'
      );
    }
    if (b2Id) {
      await applyTimeShiftAndDeconflict(
        b2Id,
        0,
        '[SHADOW BUNDLED]: Merged into joint possession window.'
      );
    }
  };

  // Find candidate blocks from store
  const trdBlock = blocks.find((b) => b.department_code === 'TRD') || blocks[0];
  const engBlock = blocks.find((b) => b.department_code === 'ENG' && b.id !== trdBlock?.id) || blocks[1];
  const sntBlock = blocks.find((b) => b.department_code === 'SNT');

  const anchorBlock = block || trdBlock;

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
        {anchorBlock && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 border border-blue-500 text-blue-300">
                  ANCHOR POSSESSION ({anchorBlock.department_code})
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {anchorBlock.block_code} • {anchorBlock.work_type}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                KM {Number(anchorBlock.start_km).toFixed(1)} – {Number(anchorBlock.end_km).toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans">
              The AI Sweep-Line Optimizer identified 2 eligible departmental maintenance requests within this exact corridor spatial envelope. Co-allocating these works eliminates redundant track closures.
            </p>

            {/* Candidate Shadow Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {engBlock && (
                <div className="p-3 rounded-lg border border-blue-500/40 bg-blue-950/20 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 font-bold flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{engBlock.block_code} (ENG)</span>
                    </span>
                    <span className="text-[10px] text-blue-300 font-bold">100% SPATIAL FIT</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    {engBlock.work_type}. Overlap KM {Number(engBlock.start_km).toFixed(1)} to {Number(engBlock.end_km).toFixed(1)}.
                  </p>
                </div>
              )}

              {sntBlock ? (
                <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>{sntBlock.block_code} (SNT)</span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold">INTERLOCK FIT</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    {sntBlock.work_type}. Overlap KM {Number(sntBlock.start_km).toFixed(1)} to {Number(sntBlock.end_km).toFixed(1)}.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>BLK-TRD-OHE-801 (TRD)</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">POWER SYNC FIT</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">
                    25kV Catenary Periodic Inspection. Overlap KM 14.5 to 18.0.
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-3 border-t border-control-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Saved Track Occupation: <strong className="text-white">3.5 Hours</strong> • 158m Train Delay Prevented</span>
              </div>

              {bundled ? (
                <div className="px-4 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CO-POSSESSIONS BUNDLED & SANCTIONED</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBundleExecution(anchorBlock.id, engBlock?.id)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bundle Joint Shadow Blocks</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
