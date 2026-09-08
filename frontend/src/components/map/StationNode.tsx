import React, { useState } from 'react';
import { StationData } from '../../services/mapGeoData';
import { Building2, Users, MapPin, X } from 'lucide-react';

interface StationNodeProps {
  station: StationData;
  xPercent: number;
  yPercent: number;
  isSelected: boolean;
  onSelect: (station: StationData) => void;
}

export const StationNode: React.FC<StationNodeProps> = ({
  station,
  xPercent,
  yPercent,
  isSelected,
  onSelect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 select-none"
    >
      {/* Node Beacon */}
      <button
        type="button"
        onClick={() => onSelect(station)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Station ${station.name} (${station.code})`}
        className={`group relative flex items-center justify-center transition-transform duration-200 ${
          isSelected ? 'scale-125' : 'hover:scale-115'
        }`}
      >
        <span className="absolute w-7 h-7 rounded-full bg-cyan-500/20 animate-ping pointer-events-none" />
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-extrabold shadow-lg transition-all ${
            isSelected
              ? 'bg-cyan-400 border-white text-black ring-2 ring-cyan-400/50'
              : 'bg-slate-950 border-cyan-400 text-cyan-300 group-hover:bg-cyan-950'
          }`}
        >
          {station.code.substring(0, 2)}
        </div>

        {/* Persistent Pill Label */}
        <span className="absolute top-7 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-slate-700 text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap shadow-md pointer-events-none">
          {station.name.split(' ')[0]} ({station.code})
        </span>
      </button>

      {/* Floating Detailed Station Popover */}
      {(showTooltip || isSelected) && (
        <div className="absolute left-1/2 bottom-10 -translate-x-1/2 z-40 w-64 bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3.5 shadow-2xl space-y-2 pointer-events-none">
          <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
            <div>
              <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold block">
                DELHI DIVISION STATION
              </span>
              <h4 className="text-xs font-bold font-mono text-white leading-tight">
                {station.name}
              </h4>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {station.code}
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-control-muted">Kilometer Post:</span>
              <span className="text-white font-bold">KM {station.kmPost.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Platform Tracks:</span>
              <span className="text-cyan-300 font-bold">{station.platforms} Platforms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Daily Passenger Load:</span>
              <span className="text-slate-300">{station.dailyFootfall}</span>
            </div>
            <div className="pt-1 border-t border-slate-800/80 text-[10px] text-emerald-400 truncate">
              🚇 {station.interchange}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
