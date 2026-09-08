import React, { useState } from 'react';
import { Block, DepartmentCode } from '../../types';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Clock } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState('September 2026');
  const [selectedView, setSelectedView] = useState<'WEEK' | 'MONTH'>('WEEK');

  // Days in week for Delhi Division demo
  const weekDays = [
    { day: 'Mon', date: '07 Sep', count: 2, blocks: [DEMO_BLOCKS[0]] },
    { day: 'Tue', date: '08 Sep', count: 4, blocks: [DEMO_BLOCKS[0], DEMO_BLOCKS[1]] },
    { day: 'Wed', date: '09 Sep', isToday: true, count: 5, blocks: DEMO_BLOCKS.slice(0, 4) },
    { day: 'Thu', date: '10 Sep', count: 3, blocks: [DEMO_BLOCKS[1], DEMO_BLOCKS[3]] },
    { day: 'Fri', date: '11 Sep', count: 2, blocks: [DEMO_BLOCKS[2]] },
    { day: 'Sat', date: '12 Sep', count: 6, blocks: DEMO_BLOCKS.slice(0, 5) },
    { day: 'Sun', date: '13 Sep', count: 4, blocks: [DEMO_BLOCKS[0], DEMO_BLOCKS[3]] },
  ];

  const getDeptColor = (dept: DepartmentCode) => {
    switch (dept) {
      case 'ENG':
        return 'bg-blue-950/70 border-blue-500/50 text-blue-300 hover:border-blue-400';
      case 'TRD':
        return 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:border-amber-400';
      case 'SNT':
        return 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:border-emerald-400';
      default:
        return 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 hover:border-cyan-400';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Calendar Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-control-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-mono text-white">
              Division Track Possession Calendar (Northern Railway)
            </h3>
            <p className="text-xs text-control-muted mt-0.5 font-mono">
              Scheduled maintenance corridors • Multi-department coordinate grid
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex rounded-lg border border-control-border bg-control-bg p-0.5">
            <button
              onClick={() => setSelectedView('WEEK')}
              className={`px-3 py-1 rounded-md transition ${
                selectedView === 'WEEK'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setSelectedView('MONTH')}
              className={`px-3 py-1 rounded-md transition ${
                selectedView === 'MONTH'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-control-muted hover:text-white'
              }`}
            >
              Month View
            </button>
          </div>

          <div className="flex items-center gap-1 border border-control-border bg-control-bg rounded-lg px-2 py-1 text-slate-300">
            <button className="p-0.5 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-cyan-400 px-1">{currentMonth}</span>
            <button className="p-0.5 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        {weekDays.map((d, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 min-h-[220px] flex flex-col justify-between transition-all ${
              d.isToday
                ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                : 'border-control-border bg-control-bg/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-control-border/60 pb-2 mb-2">
                <div>
                  <span className="text-xs font-mono font-extrabold text-white block">{d.day}</span>
                  <span className="text-[10px] font-mono text-control-muted">{d.date}</span>
                </div>
                {d.isToday ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500 text-black">
                    TODAY
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-control-muted font-bold">
                    {d.count} Blocks
                  </span>
                )}
              </div>

              {/* Block Tags */}
              <div className="space-y-1.5">
                {d.blocks.map((b) => (
                  <div
                    key={b.id}
                    className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${getDeptColor(
                      b.department_code
                    )}`}
                    title={`${b.block_code} - ${b.work_type}`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{b.block_code}</span>
                      <span>{b.department_code}</span>
                    </div>
                    <div className="truncate text-slate-300 font-sans mt-0.5">{b.work_type}</div>
                    <div className="flex items-center gap-1 text-[9px] text-control-muted mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{b.scheduled_start_time.split('T')[1]?.substring(0, 5)} IST</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-control-border/40 text-[9px] font-mono text-control-muted flex items-center justify-between">
              <span>Occupancy:</span>
              <strong className="text-slate-300">{(d.count * 2.8).toFixed(1)} hrs</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
