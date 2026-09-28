import React, { useMemo } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { Block } from '../../types';
import {
  Wrench,
  Zap,
  Radio,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface BlockOverlayProps {
  blocks?: Block[];
  minKm?: number;
  maxKm?: number;
  filterMode?: 'ACTIVE_ONLY' | 'ALL' | 'CONFLICTS';
  onSelectBlock?: (block: Block) => void;
}

export const BlockOverlay: React.FC<BlockOverlayProps> = ({
  blocks: propBlocks,
  minKm = 0.0,
  maxKm = 440.2,
  filterMode = 'ACTIVE_ONLY',
  onSelectBlock,
}) => {
  const storeBlocks = useBlockStore((s) => s.blocks);
  const setSelectedBlockId = useBlockStore((s) => s.setSelectedBlockId);

  const effectiveBlocks = propBlocks && propBlocks.length > 0 ? propBlocks : storeBlocks;

  // Filter blocks based on the selected mode:
  // ACTIVE_ONLY (default for clean COA display): only show badges for active occupations & conflicts
  // CONFLICTS: only show conflict blocks
  // ALL: show all operational blocks
  const visibleBlocks = useMemo(() => {
    return effectiveBlocks.filter((b) => {
      const status = b.status;
      if (filterMode === 'CONFLICTS') {
        return status === 'CONFLICT_DETECTED' || (b.conflicts && b.conflicts.length > 0);
      }
      if (filterMode === 'ACTIVE_ONLY') {
        return status === 'ACTIVE' || status === 'CONFLICT_DETECTED';
      }
      return ['ACTIVE', 'SANCTIONED', 'COORDINATED', 'PENDING_APPROVAL', 'CONFLICT_DETECTED'].includes(status);
    });
  }, [effectiveBlocks, filterMode]);

  // Convert kilometer (0.0 to 440.2) to percentage on canvas (4% to 96%)
  const kmToPercent = (km: number): number => {
    const range = Math.max(1, maxKm - minKm);
    const clamped = Math.max(minKm, Math.min(maxKm, km));
    return 4 + ((clamped - minKm) / range) * 92;
  };

  // Spline Y center matching SectionLayer track curve: Y = 50 + sin(p*PI)*14
  const getTrackCenterY = (xPercent: number): number => {
    const p = Math.max(0, Math.min(1, (xPercent - 4) / 92));
    return 50 + Math.sin(p * Math.PI) * 14;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          container: 'bg-rose-950/90 border-[#FF0040] shadow-lg shadow-rose-950/90 animate-pulse ring-1 ring-rose-400',
          badge: 'bg-rose-900 border-[#FF0040] text-rose-100',
          label: 'ACTIVE',
          textColor: 'text-rose-300',
          trackColor: '#FF0040',
        };
      case 'SANCTIONED':
        return {
          container: 'bg-emerald-950/85 border-[#00CC44] shadow-md shadow-emerald-950/80 ring-1 ring-emerald-500/50',
          badge: 'bg-emerald-900 border-[#00CC44] text-emerald-100',
          label: 'SANCTIONED',
          textColor: 'text-emerald-300',
          trackColor: '#00CC44',
        };
      case 'COORDINATED':
        return {
          container: 'bg-cyan-950/85 border-[#00FFFF] shadow-md shadow-cyan-950/80 ring-1 ring-cyan-400/50',
          badge: 'bg-cyan-900 border-[#00FFFF] text-cyan-100',
          label: 'AI DECONFLICTED',
          textColor: 'text-cyan-300',
          trackColor: '#00FFFF',
        };
      case 'CONFLICT_DETECTED':
        return {
          container: 'bg-red-950/95 border-[#FF0000] border-dashed animate-pulse ring-2 ring-red-500',
          badge: 'bg-red-900 border-[#FF0000] text-red-100',
          label: 'CONFLICT',
          textColor: 'text-red-300',
          trackColor: '#FF0000',
        };
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
      default:
        return {
          container: 'bg-amber-950/80 border-[#FFAA00] border-dashed shadow-sm shadow-amber-950/50',
          badge: 'bg-amber-900 border-[#FFAA00] text-amber-100',
          label: 'PENDING',
          textColor: 'text-amber-300',
          trackColor: '#FFAA00',
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
        return <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />;
    }
  };

  const handleClick = (block: Block) => {
    setSelectedBlockId(block.id);
    if (onSelectBlock) {
      onSelectBlock(block);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* ------------------------------------------------------------- */}
      {/* ON-TRACK POSSESSION HIGHLIGHT STRIPS                          */}
      {/* Rendered directly along the rail without text clutter         */}
      {/* ------------------------------------------------------------- */}
      {effectiveBlocks.map((b) => {
        const startKm = Number(b.start_km) || 0;
        const endKm = Number(b.end_km) || startKm + 2.0;
        const leftPercent = kmToPercent(startKm);
        const rightPercent = kmToPercent(endKm);
        const widthPercent = Math.max(1.5, rightPercent - leftPercent);
        const midXPercent = leftPercent + widthPercent / 2;
        const baseYPercent = getTrackCenterY(midXPercent);
        const isUp = (b.line_type || '').toUpperCase() === 'UP';
        const lineOffset = isUp ? -2.0 : 2.0;
        const style = getStatusBadgeStyle(b.status);

        return (
          <div
            key={`track-possession-${b.id}`}
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              top: `${baseYPercent + lineOffset}%`,
            }}
            className="absolute -translate-y-1/2 h-3 rounded-full pointer-events-auto cursor-pointer group opacity-85 hover:opacity-100 transition-opacity"
            onClick={() => handleClick(b)}
            title={`${b.block_code} (${b.department_code}): KM ${startKm.toFixed(1)}–${endKm.toFixed(1)} • ${style.label}`}
          >
            {/* Glowing Track Segment */}
            <div
              className={`w-full h-full rounded-full border shadow-sm ${
                b.status === 'ACTIVE'
                  ? 'bg-rose-500/60 border-[#FF0040] animate-pulse shadow-rose-500/50'
                  : b.status === 'COORDINATED'
                  ? 'bg-cyan-500/50 border-[#00FFFF]'
                  : b.status === 'CONFLICT_DETECTED'
                  ? 'bg-red-500/60 border-red-500 animate-pulse'
                  : 'bg-emerald-500/40 border-emerald-400'
              }`}
            />
          </div>
        );
      })}

      {/* ------------------------------------------------------------- */}
      {/* SELECTIVE ON-TRACK CALLOUT BADGES                             */}
      {/* Shows badges for active occupations & conflicts (uncluttered) */}
      {/* ------------------------------------------------------------- */}
      {visibleBlocks.map((b, idx) => {
        const startKm = Number(b.start_km) || 0;
        const endKm = Number(b.end_km) || startKm + 2.0;
        const leftPercent = kmToPercent(startKm);
        const rightPercent = kmToPercent(endKm);
        const widthPercent = Math.max(4.5, rightPercent - leftPercent);
        const midXPercent = leftPercent + widthPercent / 2;
        const baseYPercent = getTrackCenterY(midXPercent);
        const isUp = (b.line_type || '').toUpperCase() === 'UP';

        // Stagger placement:
        // UP line blocks float ABOVE track: -26px
        // DOWN line blocks float BELOW track: +26px
        // Alternate slightly (±8px) for adjacent blocks
        const verticalStagger = (idx % 2 === 0 ? 0 : 8);
        const yOffsetPx = isUp ? -28 - verticalStagger : 28 + verticalStagger;
        const style = getStatusBadgeStyle(b.status);

        return (
          <div
            key={`badge-${b.id}`}
            style={{
              left: `${leftPercent}%`,
              top: `calc(${baseYPercent}% + ${yOffsetPx}px)`,
            }}
            className="absolute -translate-y-1/2 pointer-events-auto cursor-pointer group select-none transition-all duration-200 z-25"
            onClick={() => handleClick(b)}
          >
            {/* Compact Callout Pill */}
            <div
              className={`h-6 px-2 rounded-md border flex items-center gap-1.5 backdrop-blur-md whitespace-nowrap shadow-lg ${style.container}`}
            >
              {getDeptIcon(b.department_code)}

              <span className="font-mono text-[9px] font-black text-white">
                {b.block_code}
              </span>

              <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border ${style.badge}`}>
                {style.label}
              </span>

              <span className="text-[8px] font-mono text-cyan-300 font-bold border-l border-slate-700 pl-1">
                KM {startKm.toFixed(1)}–{endKm.toFixed(1)}
              </span>
            </div>

            {/* Hover Detailed Inspection Popover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 -top-14 bg-slate-950/98 border border-cyan-500/70 px-3 py-1.5 rounded-xl text-[10px] font-mono text-white whitespace-nowrap shadow-2xl pointer-events-none z-50 flex items-center gap-2">
              <span className={`font-bold ${style.textColor}`}>[{b.department_code}]</span>
              <span>{(b as any).work_type_display || b.work_type}</span>
              <span className="text-cyan-400 font-bold">•</span>
              <span className="text-slate-300">{style.label}</span>
              {(b as any).duration_hours && (
                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {(b as any).duration_hours}h
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
