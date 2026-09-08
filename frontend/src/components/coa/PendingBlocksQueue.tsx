import React from 'react';
import { Block, BlockStatus } from '../../types';
import { Clock, AlertTriangle, ShieldCheck, Zap, ChevronRight, ArrowUpRight } from 'lucide-react';

interface PendingBlocksQueueProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (block: Block) => void;
}

export const PendingBlocksQueue: React.FC<PendingBlocksQueueProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
}) => {
  // Pending items awaiting COA action (SUBMITTED, COORDINATED, PENDING_APPROVAL)
  const pendingBlocks = blocks.filter((b) =>
    ['SUBMITTED', 'COORDINATED', 'PENDING_APPROVAL'].includes(b.status)
  );

  const getPriorityBadge = (block: Block) => {
    if (block.work_type.toLowerCase().includes('emergency') || block.work_type.toLowerCase().includes('usfd')) {
      return { label: 'P1 • EMERGENCY', class: 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse' };
    }
    if (block.department_code === 'ENG') {
      return { label: 'P2 • TRACK POSSESSION', class: 'bg-blue-950/80 border-blue-500 text-blue-300' };
    }
    if (block.department_code === 'TRD') {
      return { label: 'P2 • 25kV POWER CUTOFF', class: 'bg-amber-950/80 border-amber-500 text-amber-300' };
    }
    return { label: 'P3 • SHADOW INTERLOCK', class: 'bg-emerald-950/80 border-emerald-500 text-emerald-300' };
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'ENG':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      case 'TRD':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'SNT':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      default:
        return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-control-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Pending Possession Queue (COA Authority)
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Awaiting Chief Operating Controller sanction or revision
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/70 border border-amber-500/50 text-amber-300">
          {pendingBlocks.length} QUEUED
        </span>
      </div>

      {pendingBlocks.length === 0 ? (
        <div className="p-8 text-center text-control-muted font-mono text-xs border border-dashed border-control-border rounded-xl">
          ✓ All proposed track possessions have been sanctioned or cleared.
        </div>
      ) : (
        <div className="space-y-3">
          {pendingBlocks.map((b) => {
            const isSelected = selectedBlockId === b.id;
            const priority = getPriorityBadge(b);

            return (
              <div
                key={b.id}
                onClick={() => onSelectBlock(b)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                    : 'border-control-border bg-control-bg/70 hover:border-slate-600 hover:bg-control-bg'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${priority.class}`}>
                      {priority.label}
                    </span>
                    <span className="text-xs font-bold font-mono text-white">
                      {b.block_code}
                    </span>
                  </div>

                  <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold border ${getDepartmentColor(b.department_code)}`}>
                    {b.department_code}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans line-clamp-1 mb-2.5">
                  {b.work_type}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-control-muted border-t border-control-border/60 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">
                      KM {b.start_km.toFixed(1)}–{b.end_km.toFixed(1)}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">{b.line_type} LINE</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>
                      {b.scheduled_start_time.split('T')[1]?.substring(0, 5)}–{b.scheduled_end_time.split('T')[1]?.substring(0, 5)} IST
                    </span>
                  </div>
                </div>

                {b.traction_power_cutoff_required && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                    <Zap className="w-3 h-3" />
                    <span>Requires 25kV OHE Isolation Permit</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
