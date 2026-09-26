import React, { useState } from 'react';
import { Block } from '../../types';
import { Clock, ShieldCheck, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [queueTab, setQueueTab] = useState<'AWAITING' | 'COORDINATED'>('AWAITING');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Filter blocks based on active tab
  const filteredBlocks = blocks
    .filter((b) => {
      if (queueTab === 'AWAITING') {
        return ['SUBMITTED', 'PENDING_APPROVAL', 'CONFLICT_DETECTED', 'PROPOSED'].includes(b.status);
      } else {
        return b.status === 'COORDINATED';
      }
    })
    .filter((b) => deptFilter === 'ALL' || b.department_code === deptFilter)
    .sort((a, b) => {
      const timeA = new Date(a.created_at || a.scheduled_start_time || 0).getTime();
      const timeB = new Date(b.created_at || b.scheduled_start_time || 0).getTime();
      return timeB - timeA;
    });

  const awaitingCount = blocks.filter((b) =>
    ['SUBMITTED', 'PENDING_APPROVAL', 'CONFLICT_DETECTED', 'PROPOSED'].includes(b.status)
  ).length;

  const coordinatedCount = blocks.filter((b) => b.status === 'COORDINATED').length;

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
      {/* Header and Queue Tabs */}
      <div className="border-b border-control-border pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${awaitingCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <h3 className="text-sm font-extrabold font-mono text-white">
                Pending Possession Queue
              </h3>
            </div>
            <p className="text-xs text-control-muted mt-0.5 font-mono">
              Chief Operating Controller (COA) Sanction Authority
            </p>
          </div>

          {/* Department Filter Buttons */}
          <div className="flex bg-control-bg rounded-lg border border-control-border overflow-hidden text-[10px] font-mono font-bold">
            {['ALL', 'ENG', 'TRD', 'SNT'].map((dept) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-2 py-1 transition-colors ${
                  deptFilter === dept
                    ? 'bg-cyan-900/60 text-cyan-300 border-b-2 border-cyan-400'
                    : 'text-control-muted hover:text-slate-300'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Mode Switcher: Awaiting Action vs Deconflicted */}
        <div className="flex bg-control-bg/80 p-1 rounded-lg border border-control-border text-xs font-mono">
          <button
            onClick={() => setQueueTab('AWAITING')}
            className={`flex-1 py-1.5 px-3 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${
              queueTab === 'AWAITING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-control-muted hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Awaiting Action ({awaitingCount})</span>
          </button>

          <button
            onClick={() => setQueueTab('COORDINATED')}
            className={`flex-1 py-1.5 px-3 rounded-md font-bold transition flex items-center justify-center gap-1.5 ${
              queueTab === 'COORDINATED'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-control-muted hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deconflicted ({coordinatedCount})</span>
          </button>
        </div>
      </div>

      {/* Queue Items List */}
      {filteredBlocks.length === 0 ? (
        <div className="p-8 text-center text-control-muted font-mono text-xs border border-dashed border-control-border rounded-xl">
          {queueTab === 'AWAITING' ? (
            <div className="space-y-1">
              <span className="text-emerald-400 font-bold block text-sm">✓ Queue Clear</span>
              <span>All proposed track possessions have been sanctioned or deconflicted.</span>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-cyan-400 font-bold block text-sm">No Coordinated Blocks Yet</span>
              <span>Apply conflict solutions in the AI Sweep-Line engine below to deconflict blocks.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBlocks.map((b) => {
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
                    <span
                      title="Optimistic Lock Version"
                      className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-900 border border-cyan-500/40 text-cyan-300"
                    >
                      v{b.version ?? 1}
                    </span>
                    {b.status === 'COORDINATED' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                        DECONFLICTED
                      </span>
                    )}
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
                      KM {Number(b.start_km).toFixed(1)}–{Number(b.end_km).toFixed(1)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(b.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:translate-x-0.5 transition">
                    <span>{isSelected ? 'Selected' : 'Open'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
