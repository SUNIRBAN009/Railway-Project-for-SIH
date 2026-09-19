import React, { useState } from 'react';
import { Block, Train } from '../../types';
import { DEMO_BLOCKS, DEMO_TRAINS } from '../../services/demoData';
import { Clock, Train as TrainIcon, ShieldAlert, Sparkles, AlertTriangle, Layers } from 'lucide-react';

interface BlockTimelineProps {
  corridorCode?: string;
}

export const BlockTimeline: React.FC<BlockTimelineProps> = ({ corridorCode = 'NDLS-GZB-UP' }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'NIGHT' | 'FULL'>('NIGHT');

  // Timeline hours
  // NIGHT: 00:00 to 06:00 (Prime Indian Railways maintenance window)
  // FULL: 00:00 to 24:00
  const hours = selectedTimeRange === 'NIGHT'
    ? [0, 1, 2, 3, 4, 5, 6]
    : Array.from({ length: 25 }, (_, i) => i);

  const startHour = hours[0];
  const totalHours = hours[hours.length - 1] - startHour;

  const getPositionPercent = (timeStr: string) => {
    // Expected format "2026-09-09THH:MM:SS" or "HH:MM"
    let hour = 0;
    let min = 0;
    if (timeStr.includes('T')) {
      const timePart = timeStr.split('T')[1];
      const parts = timePart.split(':');
      hour = parseInt(parts[0], 10);
      min = parseInt(parts[1], 10);
    } else if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      hour = parseInt(parts[0], 10);
      min = parseInt(parts[1], 10);
    }
    const fractionalHour = hour + min / 60;
    const clamped = Math.max(startHour, Math.min(hours[hours.length - 1], fractionalHour));
    return ((clamped - startHour) / totalHours) * 100;
  };

  // Scheduled demo train paths during 00:00 - 06:00
  const trainSchedules = [
    {
      train: DEMO_TRAINS[0], // 12424 Rajdhani
      passTime: '02:15',
      durationMinutes: 20,
      corridor: 'NDLS-GZB-UP',
      color: 'bg-rose-500/80 border-rose-400 text-white',
      priority: 'PRIORITY 1',
    },
    {
      train: DEMO_TRAINS[1], // 12004 Shatabdi
      passTime: '05:30',
      durationMinutes: 20,
      corridor: 'NDLS-GZB-UP',
      color: 'bg-amber-500/80 border-amber-400 text-white',
      priority: 'PRIORITY 2',
    },
    {
      train: DEMO_TRAINS[3], // BCN Freight
      passTime: '01:00',
      durationMinutes: 35,
      corridor: 'NDLS-GZB-UP',
      color: 'bg-slate-600/80 border-slate-500 text-slate-200',
      priority: 'FREIGHT',
    },
  ];

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-control-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Corridor Possession Gantt & Train Path Deconfliction
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Corridor: <span className="text-cyan-400 font-bold">{corridorCode}</span> • Sweep-line Time Occupancy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-control-border bg-control-bg p-0.5 text-xs font-mono">
            <button
              onClick={() => setSelectedTimeRange('NIGHT')}
              className={`px-3 py-1 rounded-md transition ${
                selectedTimeRange === 'NIGHT'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              Night Window (00:00 – 06:00)
            </button>
            <button
              onClick={() => setSelectedTimeRange('FULL')}
              className={`px-3 py-1 rounded-md transition ${
                selectedTimeRange === 'FULL'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              24-Hour Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-mono flex-wrap bg-control-bg/60 p-2.5 rounded-lg border border-control-border">
        <span className="text-control-muted font-bold text-[10px] uppercase">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400 inline-block" />
          <span>ENG Track Tamping</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-600 border border-amber-400 inline-block" />
          <span>TRD OHE Shutdown</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400 inline-block" />
          <span>S&T Signals (Shadow Block)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-600 border border-rose-400 inline-block" />
          <span>High Priority Train Path</span>
        </span>
      </div>

      {/* Gantt Canvas */}
      <div className="space-y-6 pt-2">
        {/* Timeline Header Ruler */}
        <div className="relative h-7 border-b border-control-border text-[11px] font-mono text-control-muted">
          {hours.map((h, i) => (
            <div
              key={h}
              style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
              className="absolute -translate-x-1/2 flex flex-col items-center"
            >
              <span>{String(h).padStart(2, '0')}:00</span>
              <div className="h-2 w-px bg-control-border" />
            </div>
          ))}
        </div>

        {/* Lane 1: Civil Engineering (ENG) Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-blue-400 font-bold">
            <span>LANE 1: Civil Engineering (Track & Tamping)</span>
            <span className="text-[10px] text-control-muted">UP LINE</span>
          </div>

          <div className="relative h-12 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {/* Hour grid lines */}
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/40 pointer-events-none"
              />
            ))}

            {/* Block 1 (CSM Tamping: 01:30 to 04:30) */}
            <div
              style={{
                left: `${getPositionPercent('01:30')}%`,
                width: `${getPositionPercent('04:30') - getPositionPercent('01:30')}%`,
              }}
              className="absolute top-1.5 bottom-1.5 rounded-lg bg-blue-600/90 border border-blue-400 text-white p-1.5 text-xs font-mono shadow-md flex items-center justify-between overflow-hidden cursor-pointer hover:brightness-110 transition"
              title="BLK-ENG-NDLS-01 (CSM-092) | 01:30 - 04:30 IST | KM 12.4 - 16.8"
            >
              <div className="truncate">
                <span className="font-bold">BLK-ENG-NDLS-01</span>
                <span className="text-[10px] opacity-80 block truncate">CSM-092 Tamper (KM 12.4–16.8)</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-300 shrink-0 hidden sm:inline">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Lane 2: Traction Distribution (TRD) Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 font-bold">
            <span>LANE 2: Electrical Traction (25kV OHE Isolation)</span>
            <span className="text-[10px] text-control-muted">POWER SHUTDOWN</span>
          </div>

          <div className="relative h-12 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/40 pointer-events-none"
              />
            ))}

            {/* Block 2 (TRD OHE: 02:00 to 04:00) */}
            <div
              style={{
                left: `${getPositionPercent('02:00')}%`,
                width: `${getPositionPercent('04:00') - getPositionPercent('02:00')}%`,
              }}
              className="absolute top-1.5 bottom-1.5 rounded-lg bg-amber-600/90 border border-amber-400 text-white p-1.5 text-xs font-mono shadow-md flex items-center justify-between overflow-hidden cursor-pointer hover:brightness-110 transition"
              title="BLK-TRD-OHE-02 (TW-104) | 02:00 - 04:00 IST | 25kV Cutoff"
            >
              <div className="truncate">
                <span className="font-bold">BLK-TRD-OHE-02</span>
                <span className="text-[10px] opacity-80 block truncate">TW-104 Tower Wagon (25kV Power Off)</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-300 shrink-0 hidden sm:inline">
                SANCTIONED
              </span>
            </div>
          </div>
        </div>

        {/* Lane 3: Signal & Telecom (S&T) Shadow Blocks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
            <span>LANE 3: Signal & Telecom (Interlocking & Track Circuits)</span>
            <span className="text-[10px] text-emerald-300 font-normal">SHADOW BUNDLED WITH LANE 1</span>
          </div>

          <div className="relative h-12 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/40 pointer-events-none"
              />
            ))}

            {/* Block 3 (S&T Point Machine: 02:15 to 03:45) */}
            <div
              style={{
                left: `${getPositionPercent('02:15')}%`,
                width: `${getPositionPercent('03:45') - getPositionPercent('02:15')}%`,
              }}
              className="absolute top-1.5 bottom-1.5 rounded-lg bg-emerald-600/90 border border-emerald-400 text-white p-1.5 text-xs font-mono shadow-md flex items-center justify-between overflow-hidden cursor-pointer hover:brightness-110 transition"
              title="BLK-SNT-SIG-03 | 02:15 - 03:45 IST | Point 104 Overhaul"
            >
              <div className="truncate">
                <span className="font-bold">BLK-SNT-SIG-03</span>
                <span className="text-[10px] opacity-80 block truncate">Point 104 Interlocking (Shadow)</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-300 shrink-0 hidden sm:inline">
                COORDINATED
              </span>
            </div>
          </div>
        </div>

        {/* Lane 4: Scheduled Train Paths (Rajdhani, Shatabdi, Freight) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold">
            <span>LANE 4: Commercial Train Paths & Schedule Clashes</span>
            <span className="text-[10px] text-control-muted">TIMETABLE OCCUPANCY</span>
          </div>

          <div className="relative h-12 rounded-xl bg-control-bg border border-control-border overflow-hidden">
            {hours.map((_, i) => (
              <div
                key={i}
                style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                className="absolute top-0 bottom-0 w-px bg-control-border/40 pointer-events-none"
              />
            ))}

            {trainSchedules.map((ts, idx) => (
              <div
                key={idx}
                style={{
                  left: `${getPositionPercent(ts.passTime)}%`,
                  width: '8%',
                }}
                className={`absolute top-1.5 bottom-1.5 rounded-lg border p-1 text-xs font-mono shadow-md flex items-center justify-between cursor-pointer hover:scale-105 transition-transform ${ts.color}`}
                title={`Train #${ts.train.train_number} - ${ts.train.train_name} | Scheduled Pass: ${ts.passTime}`}
              >
                <div className="truncate">
                  <span className="font-bold">#{ts.train.train_number}</span>
                  <span className="text-[9px] opacity-90 block truncate">{ts.train.train_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
