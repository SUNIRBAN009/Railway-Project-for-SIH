import React, { useState } from 'react';
import { StationData } from '../../services/mapGeoData';

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
  const km = Number(station.kmPost ?? (station as any).km_from_source ?? 0);

  return (
    <div
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 select-none pointer-events-auto"
    >
      {/* Station Beacon Button */}
      <button
        type="button"
        onClick={() => onSelect(station)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Station ${station.name} (${station.code})`}
        className={`group relative flex flex-col items-center transition-transform duration-150 ${
          isSelected ? 'scale-125' : 'hover:scale-115'
        }`}
      >
        {/* Pulsing ring for junction hubs */}
        {(station.platforms > 6 || station.code === 'NDLS' || station.code === 'CNB' || station.code === 'GZB') && (
          <span className="absolute -top-1 w-8 h-8 rounded-full bg-cyan-400/25 animate-ping pointer-events-none" />
        )}

        {/* Circular Station Badge */}
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-black shadow-lg transition-all ${
            isSelected
              ? 'bg-cyan-400 border-white text-black ring-2 ring-cyan-400/80 shadow-cyan-500/50'
              : 'bg-slate-950 border-cyan-400 text-cyan-300 group-hover:bg-cyan-900 group-hover:text-white'
          }`}
        >
          {station.code.substring(0, 2)}
        </div>

        {/* Station Name & KM Post Label Below - Staggered cleanly */}
        <div className="mt-1 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-sm border border-slate-700/80 flex items-center gap-1 shadow-md pointer-events-none">
          <span className="font-mono text-[9px] font-extrabold text-white whitespace-nowrap">
            {station.code}
          </span>
          <span className="font-mono text-[8px] text-cyan-400 font-bold whitespace-nowrap">
            KM {km.toFixed(0)}
          </span>
        </div>
      </button>

      {/* Lightweight Hover-Only Tooltip (NEVER sticks permanently to block map!) */}
      {showTooltip && !isSelected && (
        <div className="absolute left-1/2 bottom-12 -translate-x-1/2 z-50 w-60 bg-slate-950/98 backdrop-blur-xl border border-cyan-500/70 rounded-xl p-3 shadow-2xl space-y-1.5 pointer-events-none font-mono text-xs">
          <div className="flex items-start justify-between border-b border-slate-800 pb-1">
            <div>
              <span className="text-[8px] uppercase text-cyan-400 font-bold block">
                {station.division ? `${station.division.toUpperCase()} DIV` : 'NR DIVISION'}
              </span>
              <h4 className="text-xs font-bold text-white leading-tight">
                {station.name}
              </h4>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              {station.code}
            </span>
          </div>

          <div className="space-y-0.5 text-[10px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-control-muted">Kilometer:</span>
              <span className="text-white font-bold">KM {km.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Platform Tracks:</span>
              <span className="text-cyan-300 font-bold">{station.platforms || 4} Platforms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Daily Footfall:</span>
              <span className="text-slate-300">{station.dailyFootfall || 'High Traffic'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
