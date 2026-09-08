import React, { useState } from 'react';
import { LiveMapTrain } from '../../services/mapGeoData';
import { Train as TrainIcon, Navigation, Clock, Activity } from 'lucide-react';

interface TrainMarkerProps {
  train: LiveMapTrain;
  xPercent: number;
  yPercent: number;
  isSelected: boolean;
  onSelect: (train: LiveMapTrain) => void;
}

export const TrainMarker: React.FC<TrainMarkerProps> = ({
  train,
  xPercent,
  yPercent,
  isSelected,
  onSelect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'SUPERFAST':
        return 'bg-rose-600 border-white text-white shadow-rose-950';
      case 'SHATABDI':
        return 'bg-amber-500 border-white text-black shadow-amber-950';
      case 'DURONTO':
        return 'bg-emerald-600 border-white text-white shadow-emerald-950';
      case 'FREIGHT':
      default:
        return 'bg-slate-700 border-slate-400 text-white shadow-slate-950';
    }
  };

  return (
    <div
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 select-none transition-all duration-700 ease-linear"
    >
      <button
        type="button"
        onClick={() => onSelect(train)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Train ${train.trainNumber} (${train.trainName})`}
        className={`group relative flex items-center justify-center transition-transform ${
          isSelected ? 'scale-125' : 'hover:scale-115'
        }`}
      >
        {/* Radar wave */}
        <span className="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />

        <div
          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shadow-lg transition-transform ${getMarkerColor(
            train.type
          )}`}
          style={{ transform: `rotate(${train.heading}deg)` }}
        >
          <Navigation className="w-3.5 h-3.5" />
        </div>

        {/* Live Speed / Delay Floating Pill */}
        <div className="absolute -top-7 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-slate-700 text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none">
          <span className="font-extrabold text-white">#{train.trainNumber}</span>
          <span className="text-cyan-300 font-bold">{train.speedKmh} km/h</span>
          <span
            className={`font-bold ${
              train.delayMinutes === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {train.delayMinutes === 0 ? 'RT' : `+${train.delayMinutes}m`}
          </span>
        </div>
      </button>

      {/* Hover Card */}
      {(showTooltip || isSelected) && (
        <div className="absolute left-1/2 top-10 -translate-x-1/2 z-40 w-60 bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 shadow-2xl space-y-1.5 pointer-events-none font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-extrabold text-white">#{train.trainNumber}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              {train.type}
            </span>
          </div>

          <p className="text-slate-200 font-sans text-xs font-bold leading-tight">
            {train.trainName}
          </p>

          <div className="space-y-1 text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-control-muted">Live Speed:</span>
              <span className="text-cyan-300 font-bold">{train.speedKmh} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Schedule Status:</span>
              <span
                className={`font-bold ${
                  train.delayMinutes === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {train.delayMinutes === 0 ? 'Running On-Time (RT)' : `Delayed +${train.delayMinutes} Mins`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Current Block Section:</span>
              <span className="text-white truncate max-w-[130px]">{train.currentSection}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
