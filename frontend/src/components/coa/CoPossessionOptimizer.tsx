import React, { useState } from 'react';
import { Sparkles, Layers, CheckCircle2, ShieldCheck, ArrowRight, Zap, Radio, Wrench } from 'lucide-react';

export const CoPossessionOptimizer: React.FC = () => {
  const [bundled, setBundled] = useState(false);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 border border-blue-500 text-blue-300">
              ANCHOR POSSESSION (ENG)
            </span>
            <span className="text-xs font-mono font-bold text-white">
              BLK-ENG-NDLS-01 • CSM-092 Tamper
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-300">KM 12.4 – 16.8 (01:30 – 04:30 IST)</span>
        </div>

        <p className="text-xs text-slate-300 font-sans">
          Primary heavy track possession sanctioned. The AI optimizer identified 2 eligible departmental maintenance requests within this exact corridor spatial envelope:
        </p>

        {/* Candidate Shadow Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Shadow 1: S&T */}
          <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                <span>S&T Point 104 Overhaul</span>
              </span>
              <span className="text-[10px] text-emerald-300 font-bold">100% SPATIAL FIT</span>
            </div>
            <p className="text-slate-300 text-[11px] font-sans">
              Point 104A/B at KM 15.0. Requested 02:15 - 03:45 IST. Fits completely within the CSM tamping window.
            </p>
          </div>

          {/* Shadow 2: TRD */}
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>TRD Catenary Droppers</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold">POWER SYNC FIT</span>
            </div>
            <p className="text-slate-300 text-[11px] font-sans">
              Tower Wagon TW-104 inspection KM 14.0 - 15.5. 25kV power cutoff aligned with track block.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-control-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-control-muted flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Saved Track Occupation: <strong className="text-white">3.2 Hours</strong> • 0 Extra Train Delays</span>
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
      </div>
    </div>
  );
};
