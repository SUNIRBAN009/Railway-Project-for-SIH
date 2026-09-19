import React from 'react';
import { Block } from '../../types';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Wrench, Zap, Radio, Clock, ShieldAlert } from 'lucide-react';

interface BlockOverlayProps {
  blocks?: Block[];
  onSelectBlock?: (block: Block) => void;
}

export const BlockOverlay: React.FC<BlockOverlayProps> = ({
  blocks = DEMO_BLOCKS,
  onSelectBlock,
}) => {
  // Only render active or sanctioned blocks
  const activeBlocks = blocks.filter((b) => ['ACTIVE', 'SANCTIONED'].includes(b.status));

  return (
    <div className="absolute inset-0 pointer-events-none z-15">
      {activeBlocks.map((b) => {
        // Map KM 12.0 - 16.8 to relative percentage across the NDLS-GZB line (approx 45% to 65% width)
        const isEng = b.department_code === 'ENG';
        const leftPercent = isEng ? 50 : 54;
        const widthPercent = isEng ? 18 : 10;
        const topPercent = isEng ? 52 : 50;

        return (
          <div
            key={b.id}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              top: `${topPercent}%`,
            }}
            className="absolute -translate-y-1/2 pointer-events-auto cursor-pointer group"
            onClick={() => onSelectBlock && onSelectBlock(b)}
            title={`${b.block_code}: ${b.work_type}`}
          >
            {/* Pulsing Zone Glow */}
            <div
              className={`h-8 rounded-lg border-2 border-dashed transition-all flex items-center justify-between px-2 ${
                b.status === 'ACTIVE'
                  ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50 animate-pulse'
                  : 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50'
              }`}
            >
              <div className="flex items-center gap-1 text-[10px] font-mono font-extrabold text-white truncate">
                {b.department_code === 'ENG' ? (
                  <Wrench className="w-3 h-3 text-blue-400 shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{b.block_code}</span>
              </div>

              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-black/80 text-white shrink-0 hidden sm:inline">
                {b.status}
              </span>
            </div>

            {/* Hover Pill */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-xl pointer-events-none">
              KM {b.start_km.toFixed(1)} – {b.end_km.toFixed(1)} • {b.equipment_required || b.work_type}
            </div>
          </div>
        );
      })}
    </div>
  );
};
