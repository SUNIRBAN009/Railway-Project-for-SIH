import React, { useState } from 'react';
import { UnifiedTrain } from './TrainMarker';
import {
  Train as TrainIcon,
  Search,
  ArrowRight,
  ArrowLeft,
  Clock,
  Gauge,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface TrainTelemetryPanelProps {
  trains: UnifiedTrain[];
  selectedTrain: UnifiedTrain | null;
  onSelectTrain: (train: UnifiedTrain) => void;
}

export const TrainTelemetryPanel: React.FC<TrainTelemetryPanelProps> = ({
  trains,
  selectedTrain,
  onSelectTrain,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');

  const filteredTrains = trains.filter((t) => {
    const num = ('train_number' in t ? t.train_number : t.trainNumber) || '';
    const name = ('train_name' in t ? t.train_name : t.trainName) || '';
    const dir = (('direction' in t ? t.direction : t.lineType) || '').toUpperCase();

    const matchesSearch = num.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDir = filterDirection === 'ALL' || dir === filterDirection;
    return matchesSearch && matchesDir;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-control-border font-mono select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-control-border bg-slate-900/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrainIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black tracking-wide text-white uppercase">
              Live Telemetry
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
            {filteredTrains.length} RAKES
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search train # or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Direction Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
          <button
            onClick={() => setFilterDirection('ALL')}
            className={`py-1 rounded font-extrabold transition ${
              filterDirection === 'ALL'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterDirection('DOWN')}
            className={`py-1 rounded font-extrabold transition flex items-center justify-center gap-1 ${
              filterDirection === 'DOWN'
                ? 'bg-[#00BFFF] text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>DOWN</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => setFilterDirection('UP')}
            className={`py-1 rounded font-extrabold transition flex items-center justify-center gap-1 ${
              filterDirection === 'UP'
                ? 'bg-[#00FF41] text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-2.5 h-2.5" />
            <span>UP</span>
          </button>
        </div>
      </div>

      {/* Train Cards Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5 custom-scrollbar">
        {filteredTrains.map((train) => {
          const num = ('train_number' in train ? train.train_number : train.trainNumber) || 'TRN';
          const name = ('train_name' in train ? train.train_name : train.trainName) || 'Express';
          const speed = Number(('speed_kmh' in train ? train.speed_kmh : train.speedKmh) || 0);
          const delay = Number(('delay_minutes' in train ? train.delay_minutes : train.delayMinutes) || 0);
          const km = Number(('current_km' in train ? train.current_km : 0) || 0);
          const dir = (('direction' in train ? train.direction : train.lineType) || 'DOWN').toUpperCase();
          const priority = Number(('priority_rank' in train ? train.priority_rank : 10) || 10);
          const section = ('current_section' in train ? train.current_section : train.currentSection) || 'Main Trunk';

          const isSelected = selectedTrain
            ? ('train_number' in selectedTrain ? selectedTrain.train_number : selectedTrain.id) === num
            : false;

          // Priority Styling
          const isP1 = priority <= 1 || num === '12424' || num === '22436' || num === '12301';
          const isP2 = priority === 2 || num === '12004';
          const isFreight = priority >= 50 || num.startsWith('BCN') || num.startsWith('BOXN') || num.startsWith('POL');

          return (
            <div
              key={num}
              onClick={() => onSelectTrain(train)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs font-black text-white">
                    #{num}
                  </span>
                  {isP1 && (
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-950 border border-[#FFD700] text-[#FFD700]">
                      PRIORITY 1
                    </span>
                  )}
                  {isP2 && (
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-800 border border-slate-400 text-slate-200">
                      SHATABDI
                    </span>
                  )}
                  {isFreight && (
                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-950/70 border border-[#FFAA00]/60 text-[#FFAA00]">
                      FREIGHT
                    </span>
                  )}
                </div>

                {/* Direction pill */}
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                    dir === 'DOWN'
                      ? 'bg-cyan-950 text-[#00BFFF] border-cyan-800'
                      : 'bg-emerald-950 text-[#00FF41] border-emerald-800'
                  }`}
                >
                  {dir === 'DOWN' ? 'DOWN →' : '← UP'}
                </span>
              </div>

              {/* Train Name */}
              <div className="text-[11px] font-sans font-semibold text-slate-200 truncate mb-1.5">
                {name}
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800/60 text-[10px]">
                {/* KM Post */}
                <div className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="font-bold">KM {km.toFixed(1)}</span>
                </div>

                {/* Speed */}
                <div className="flex items-center gap-1 text-slate-300">
                  <Gauge className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="font-bold">{speed > 0 ? `${speed.toFixed(0)} km/h` : 'HALT'}</span>
                </div>

                {/* Delay */}
                <div className="flex items-center justify-end">
                  <span
                    className={`font-black px-1 rounded text-[9px] ${
                      delay <= 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {delay <= 0 ? 'RT (ON TIME)' : `+${delay}m`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
