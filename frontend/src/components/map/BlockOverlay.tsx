import React from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { Block } from '../../types';
import {
  Wrench,
  Zap,
  Radio,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Flame,
} from 'lucide-react';

interface BlockOverlayProps {
  onSelectBlock?: (block: Block) => void;
}

export const BlockOverlay: React.FC<BlockOverlayProps> = ({ onSelectBlock }) => {
  const { blocks, setSelectedBlockId } = useBlockStore();

  // Show all relevant blocks: active, sanctioned, AI deconflicted (coordinated), and pending new requests
  const visibleBlocks = blocks.filter((b) =>
    ['ACTIVE', 'SANCTIONED', 'COORDINATED', 'PENDING_APPROVAL', 'CONFLICT_DETECTED', 'SUBMITTED'].includes(b.status)
  );

  // Map KM (0 to 32.0 km) to percentage on the canvas (6% to 94%)
  const kmToPercent = (km: number): number => {
    const clamped = Math.max(0, Math.min(32, km));
    return 6 + (clamped / 32) * 88;
  };

  const getTrackCenterY = (xPercent: number, lineType?: string, dept?: string): number => {
    // S-curve of the track from New Delhi (50%) through Anand Vihar (56.5%) to Sahibabad (60.5%) and Maripat (56%)
    const baseY = 50 + Math.sin(((xPercent - 6) / 88) * Math.PI) * 10.5;
    const lineOffset = lineType === 'DOWN' ? 3.5 : -1.5;
    const deptOffset = dept === 'TRD' ? -4 : dept === 'SNT' ? 3.5 : 0;
    return baseY + lineOffset + deptOffset;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          container: 'bg-rose-950/70 border-rose-500 shadow-lg shadow-rose-950/80 animate-pulse ring-1 ring-rose-400',
          badge: 'bg-rose-900 border-rose-500 text-white',
          label: 'ACTIVE OCCUPATION',
          textColor: 'text-rose-300',
        };
      case 'SANCTIONED':
        return {
          container: 'bg-emerald-950/70 border-emerald-400 shadow-lg shadow-emerald-950/80 ring-1 ring-emerald-500/50',
          badge: 'bg-emerald-900 border-emerald-400 text-white',
          label: 'SANCTIONED POSSESSION',
          textColor: 'text-emerald-300',
        };
      case 'COORDINATED':
        return {
          container: 'bg-purple-950/70 border-purple-400 shadow-lg shadow-purple-950/80 ring-1 ring-purple-500/50',
          badge: 'bg-purple-900 border-purple-400 text-white',
          label: 'AI DECONFLICTED',
          textColor: 'text-purple-300',
        };
      case 'CONFLICT_DETECTED':
        return {
          container: 'bg-rose-950/50 border-rose-500 border-dashed animate-pulse',
          badge: 'bg-rose-900 border-rose-500 text-rose-200',
          label: 'AI CONFLICT DETECTED',
          textColor: 'text-rose-300',
        };
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
      default:
        return {
          container: 'bg-amber-950/60 border-amber-400 border-dashed shadow-md shadow-amber-950/50 animate-pulse',
          badge: 'bg-amber-900 border-amber-400 text-amber-200',
          label: 'NEW REQUEST • PENDING AI',
          textColor: 'text-amber-300',
        };
    }
  };

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'ENG':
        return <Wrench className="w-3 h-3 text-blue-400 shrink-0" />;
      case 'TRD':
        return <Zap className="w-3 h-3 text-amber-400 shrink-0" />;
      case 'SNT':
        return <Radio className="w-3 h-3 text-emerald-400 shrink-0" />;
      default:
        return <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />;
    }
  };

  const handleClick = (block: Block) => {
    setSelectedBlockId(block.id);
    if (onSelectBlock) {
      onSelectBlock(block);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-15">
      {visibleBlocks.map((b) => {
        const startKm = Number(b.start_km) || 0;
        const endKm = Number(b.end_km) || startKm + 2.0;
        const leftPercent = kmToPercent(startKm);
        const rightPercent = kmToPercent(endKm);
        const widthPercent = Math.max(7.5, rightPercent - leftPercent);
        const topPercent = getTrackCenterY(leftPercent + widthPercent / 2, b.line_type, b.department_code);
        const style = getStatusBadgeStyle(b.status);

        return (
          <div
            key={b.id}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              top: `${topPercent}%`,
            }}
            className="absolute -translate-y-1/2 pointer-events-auto cursor-pointer group select-none transition-all duration-300"
            onClick={() => handleClick(b)}
            title={`${b.block_code} (${b.department_code}): KM ${startKm.toFixed(1)}–${endKm.toFixed(1)}`}
          >
            {/* Pulsing Zone Glow Box */}
            <div
              className={`h-9 rounded-xl border-2 transition-all flex items-center justify-between px-2 backdrop-blur-sm ${style.container}`}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                {getDeptIcon(b.department_code)}
                <span className="font-mono text-[10px] font-extrabold text-white truncate">
                  {b.block_code}
                </span>
              </div>

              <span
                className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded border shrink-0 hidden md:inline tracking-wider ${style.badge}`}
              >
                {style.label}
              </span>
            </div>

            {/* Persistent Mini KM Tag */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1 rounded bg-black/80 border border-slate-700 text-[9px] font-mono text-cyan-300 whitespace-nowrap shadow-sm">
              KM {startKm.toFixed(1)}–{endKm.toFixed(1)}
            </div>

            {/* Hover Detailed Pill */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-cyan-500/60 px-3 py-1.5 rounded-xl text-[10px] font-mono text-white whitespace-nowrap shadow-2xl pointer-events-none z-50 flex items-center gap-2">
              <span className={`font-bold ${style.textColor}`}>[{b.department_code}]</span>
              <span>{b.work_type}</span>
              <span className="text-cyan-400 font-bold">•</span>
              <span className="text-slate-300">{style.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
