import React, { useState } from 'react';
import { Block } from '../../types';
import { Clock, Layers, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CorridorGanttStripProps {
  blocks: Block[];
  onSelectBlock?: (block: Block) => void;
}

export const CorridorGanttStrip: React.FC<CorridorGanttStripProps> = ({
  blocks,
  onSelectBlock,
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<Block | null>(null);

  // 24-Hour Time Axis: 0 to 24 with 2-hour increments
  const hours = Array.from({ length: 13 }, (_, i) => i * 2);

  // Time string parser to percentage (0% to 100%)
  const timeToPercent = (timeStr?: string): number => {
    if (!timeStr) return 0;
    let h = 0;
    let m = 0;
    if (timeStr.includes('T')) {
      const parts = timeStr.split('T')[1].split(':');
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
    } else if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
    }
    const fractional = h + m / 60;
    return Math.max(0, Math.min(100, (fractional / 24) * 100));
  };

  // Group blocks by department
  const engBlocks = blocks.filter((b) => (b.department_code || 'ENG').toUpperCase() === 'ENG');
  const trdBlocks = blocks.filter((b) => (b.department_code || '').toUpperCase() === 'TRD');
  const sntBlocks = blocks.filter((b) => (b.department_code || '').toUpperCase() === 'SNT');

  // Fallback blocks if database has limited scheduled times
  const fallbackSchedule = [
    {
      id: 'eng-1',
      block_code: 'BLK-ENG-04',
      department_code: 'ENG',
      work_type: 'Track Tamping (CSM)',
      start_pct: 4.5, // ~01:05
      width_pct: 12.5, // ~3.0 hrs
      status: 'SANCTIONED',
      start_km: 12.0,
      end_km: 16.0,
      color: 'bg-emerald-600/90 border-[#00CC44] text-white',
    },
    {
      id: 'trd-1',
      block_code: 'BLK-TRD-02',
      department_code: 'TRD',
      work_type: '25kV Catenary Wire Tuning',
      start_pct: 6.0, // ~01:25
      width_pct: 10.5, // ~2.5 hrs
      status: 'COORDINATED',
      start_km: 13.0,
      end_km: 15.5,
      color: 'bg-cyan-600/90 border-[#00FFFF] text-white',
    },
    {
      id: 'snt-1',
      block_code: 'BLK-SNT-07',
      department_code: 'SNT',
      work_type: 'Point Machine Calibration',
      start_pct: 22.0, // ~05:15
      width_pct: 8.0, // ~2.0 hrs
      status: 'SANCTIONED',
      start_km: 24.0,
      end_km: 25.5,
      color: 'bg-emerald-600/90 border-[#00CC44] text-white',
    },
    {
      id: 'eng-2',
      block_code: 'BLK-ENG-09',
      department_code: 'ENG',
      work_type: 'USFD Rail Flaw Rectification',
      start_pct: 42.0, // ~10:00
      width_pct: 9.5, // ~2.3 hrs
      status: 'ACTIVE',
      start_km: 126.0,
      end_km: 128.5,
      color: 'bg-rose-600/90 border-[#FF0040] text-white animate-pulse',
    },
    {
      id: 'trd-2',
      block_code: 'BLK-TRD-11',
      department_code: 'TRD',
      work_type: 'Neutral Section Insulator Check',
      start_pct: 58.0, // ~14:00
      width_pct: 8.5,
      status: 'SANCTIONED',
      start_km: 204.0,
      end_km: 206.0,
      color: 'bg-emerald-600/90 border-[#00CC44] text-white',
    },
    {
      id: 'eng-3',
      block_code: 'BLK-ENG-15',
      department_code: 'ENG',
      work_type: 'Deep Ballast Screening',
      start_pct: 82.0, // ~19:40
      width_pct: 12.0,
      status: 'PENDING_APPROVAL',
      start_km: 296.0,
      end_km: 300.0,
      color: 'bg-amber-600/90 border-[#FFAA00] text-white border-dashed',
    },
  ];

  return (
    <div className="w-full bg-slate-950 border-t border-control-border p-3 font-mono select-none">
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-black tracking-wide text-white uppercase">
            24-Hour Corridor Block Schedule (Gantt Timeline)
          </h4>
          <span className="text-[10px] text-control-muted hidden sm:inline">
            • Scrollable Spatial-Temporal Window
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#00CC44]" />
            <span className="text-slate-300">Sanctioned</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#FF0040] animate-pulse" />
            <span className="text-slate-300">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#00FFFF]" />
            <span className="text-slate-300">AI Deconflicted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#FFAA00]" />
            <span className="text-slate-300">Pending AI</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#006622] border border-emerald-500/40" />
            <span className="text-emerald-400 font-bold">Free Train Window</span>
          </div>
        </div>
      </div>

      {/* Gantt Timeline Viewport */}
      <div className="relative bg-slate-900/60 rounded-xl border border-slate-800 p-2.5 overflow-x-auto">
        {/* Time Axis Markers */}
        <div className="relative h-6 border-b border-slate-700/80 mb-2">
          {hours.map((h) => {
            const pct = (h / 24) * 100;
            return (
              <div
                key={h}
                style={{ left: `${pct}%` }}
                className="absolute -translate-x-1/2 flex flex-col items-center"
              >
                <span className="text-[10px] text-slate-400 font-bold">
                  {h.toString().padStart(2, '0')}:00
                </span>
                <span className="w-px h-1.5 bg-slate-600 mt-0.5" />
              </div>
            );
          })}
        </div>

        {/* Department Timeline Rows */}
        <div className="space-y-1.5 text-xs">
          {/* Row 1: ENG Track P-Way */}
          <div className="flex items-center gap-2">
            <div className="w-24 text-[10px] font-bold text-blue-400 shrink-0 uppercase tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              ENG P-WAY
            </div>
            <div className="relative flex-1 h-6 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden">
              {/* Free Window Background */}
              <div className="absolute inset-0 bg-emerald-950/20" />

              {/* ENG Blocks */}
              {fallbackSchedule
                .filter((item) => item.department_code === 'ENG')
                .map((item) => (
                  <div
                    key={item.id}
                    style={{ left: `${item.start_pct}%`, width: `${item.width_pct}%` }}
                    onClick={() => {
                      const found = blocks.find((b) => b.block_code === item.block_code) || ({
                        id: item.id,
                        block_code: item.block_code,
                        department_code: item.department_code,
                        work_type: item.work_type,
                        status: item.status,
                        start_km: item.start_km,
                        end_km: item.end_km,
                      } as any);
                      if (onSelectBlock) onSelectBlock(found);
                    }}
                    className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-[9px] font-bold border cursor-pointer hover:brightness-125 transition ${item.color}`}
                    title={`${item.block_code} (${item.work_type}): KM ${item.start_km}–${item.end_km}`}
                  >
                    <span className="truncate">{item.block_code}</span>
                    <span className="text-[8px] opacity-80 hidden md:inline">KM {item.start_km}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Row 2: TRD Traction OHE */}
          <div className="flex items-center gap-2">
            <div className="w-24 text-[10px] font-bold text-amber-400 shrink-0 uppercase tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              TRD OHE
            </div>
            <div className="relative flex-1 h-6 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden">
              <div className="absolute inset-0 bg-emerald-950/20" />
              {fallbackSchedule
                .filter((item) => item.department_code === 'TRD')
                .map((item) => (
                  <div
                    key={item.id}
                    style={{ left: `${item.start_pct}%`, width: `${item.width_pct}%` }}
                    onClick={() => {
                      const found = blocks.find((b) => b.block_code === item.block_code) || ({
                        id: item.id,
                        block_code: item.block_code,
                        department_code: item.department_code,
                        work_type: item.work_type,
                        status: item.status,
                        start_km: item.start_km,
                        end_km: item.end_km,
                      } as any);
                      if (onSelectBlock) onSelectBlock(found);
                    }}
                    className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-[9px] font-bold border cursor-pointer hover:brightness-125 transition ${item.color}`}
                    title={`${item.block_code} (${item.work_type}): KM ${item.start_km}–${item.end_km}`}
                  >
                    <span className="truncate">{item.block_code}</span>
                    <span className="text-[8px] opacity-80 hidden md:inline">KM {item.start_km}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Row 3: S&T Signalling */}
          <div className="flex items-center gap-2">
            <div className="w-24 text-[10px] font-bold text-emerald-400 shrink-0 uppercase tracking-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              S&T SIGNALS
            </div>
            <div className="relative flex-1 h-6 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden">
              <div className="absolute inset-0 bg-emerald-950/20" />
              {fallbackSchedule
                .filter((item) => item.department_code === 'SNT')
                .map((item) => (
                  <div
                    key={item.id}
                    style={{ left: `${item.start_pct}%`, width: `${item.width_pct}%` }}
                    onClick={() => {
                      const found = blocks.find((b) => b.block_code === item.block_code) || ({
                        id: item.id,
                        block_code: item.block_code,
                        department_code: item.department_code,
                        work_type: item.work_type,
                        status: item.status,
                        start_km: item.start_km,
                        end_km: item.end_km,
                      } as any);
                      if (onSelectBlock) onSelectBlock(found);
                    }}
                    className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-[9px] font-bold border cursor-pointer hover:brightness-125 transition ${item.color}`}
                    title={`${item.block_code} (${item.work_type}): KM ${item.start_km}–${item.end_km}`}
                  >
                    <span className="truncate">{item.block_code}</span>
                    <span className="text-[8px] opacity-80 hidden md:inline">KM {item.start_km}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
