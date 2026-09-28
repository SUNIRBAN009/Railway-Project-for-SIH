import React, { useState } from 'react';
import { LiveMapTrain } from '../../services/mapGeoData';
import { LiveTrainRecord } from '../../services/api';
import { Navigation, Clock, Activity, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';

export type UnifiedTrain = (LiveMapTrain | LiveTrainRecord) & {
  displayHeading?: number;
};

interface TrainMarkerProps {
  train: UnifiedTrain;
  xPercent: number;
  yPercent: number;
  isSelected: boolean;
  onSelect: (train: UnifiedTrain) => void;
}

export const TrainMarker: React.FC<TrainMarkerProps> = ({
  train,
  xPercent,
  yPercent,
  isSelected,
  onSelect,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize field names
  const trainNumber = ('train_number' in train ? train.train_number : train.trainNumber) || 'TRN';
  const trainName = ('train_name' in train ? train.train_name : train.trainName) || 'Corridor Express';
  const speedKmh = Number(('speed_kmh' in train ? train.speed_kmh : train.speedKmh) || 0);
  const delayMinutes = Number(('delay_minutes' in train ? train.delay_minutes : train.delayMinutes) || 0);
  const rawType = ('train_type' in train ? train.train_type : train.type) || 'EXPRESS';
  const direction = (('direction' in train ? train.direction : train.lineType) || 'DOWN').toUpperCase();
  const currentSection = ('current_section' in train ? train.current_section : train.currentSection) || 'Golden Corridor Trunk';
  const currentKm = Number(('current_km' in train ? train.current_km : 0));
  const priorityRank = Number(('priority_rank' in train ? train.priority_rank : 10) || 10);

  const isUp = direction === 'UP';

  // COA Priority Styling
  const isPrestige =
    priorityRank <= 1 ||
    rawType.includes('PRESTIGE') ||
    trainNumber === '12424' ||
    trainNumber === '22436' ||
    trainNumber === '12301';

  const isShatabdi =
    priorityRank === 2 ||
    rawType.includes('SHATABDI') ||
    trainNumber === '12004';

  const isFreight =
    priorityRank >= 50 ||
    rawType.includes('FREIGHT') ||
    trainNumber.startsWith('BOXN') ||
    trainNumber.startsWith('BCN') ||
    trainNumber.startsWith('POL') ||
    trainNumber.startsWith('CONT');

  const getMarkerPalette = () => {
    if (isPrestige) {
      return {
        border: 'border-[#FFD700]',
        bg: 'bg-amber-950/95 text-[#FFD700]',
        badge: 'border-[#FFD700] bg-amber-900/60 text-[#FFD700]',
        glow: 'bg-[#FFD700]/30',
        pillSpeed: 'text-[#FFD700]',
        label: 'PRIORITY 1',
        tagBorder: 'border-[#FFD700]/60',
      };
    }
    if (isShatabdi) {
      return {
        border: 'border-[#C0C0C0]',
        bg: 'bg-slate-900/95 text-slate-100',
        badge: 'border-slate-400 bg-slate-800 text-slate-200',
        glow: 'bg-slate-300/30',
        pillSpeed: 'text-slate-200',
        label: 'SHATABDI',
        tagBorder: 'border-slate-500/60',
      };
    }
    if (isFreight) {
      return {
        border: 'border-[#FFAA00]',
        bg: 'bg-slate-950/95 text-[#FFAA00]',
        badge: 'border-[#FFAA00]/60 bg-amber-950/70 text-[#FFAA00]',
        glow: 'bg-amber-500/20',
        pillSpeed: 'text-amber-400',
        label: 'FREIGHT',
        tagBorder: 'border-amber-600/60',
      };
    }
    return {
      border: 'border-[#00FF41]',
      bg: 'bg-emerald-950/95 text-[#00FF41]',
      badge: 'border-emerald-500/60 bg-emerald-950 text-emerald-300',
      glow: 'bg-emerald-500/20',
      pillSpeed: 'text-emerald-300',
      label: 'EXPRESS',
      tagBorder: 'border-emerald-600/60',
    };
  };

  const palette = getMarkerPalette();

  return (
    <div
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-35 select-none pointer-events-auto"
      data-testid={`train-marker-${trainNumber}`}
    >
      <button
        type="button"
        onClick={() => onSelect(train)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Train ${trainNumber} (${trainName})`}
        className={`group relative flex items-center justify-center transition-transform duration-100 ${
          isSelected ? 'scale-125 z-40' : 'hover:scale-115'
        }`}
      >
        {/* Pulsing beacon wave for high-speed active trains */}
        {speedKmh > 0 && (
          <span className={`absolute w-8 h-8 rounded-full ${palette.glow} animate-ping pointer-events-none`} />
        )}

        {/* Sleek Aerodynamic Train Capsule (Riding Directly on Rail) */}
        <div
          className={`h-6 px-2 rounded-full border-2 flex items-center gap-1 shadow-2xl backdrop-blur-md transition-all ${palette.bg} ${palette.border}`}
        >
          {/* Leading Arrow */}
          {isUp && <span className="text-[11px] font-black leading-none">&larr;</span>}

          <span className="font-mono text-[9px] font-black tracking-tight whitespace-nowrap">
            {trainNumber}
          </span>

          {!isUp && <span className="text-[11px] font-black leading-none">&rarr;</span>}
        </div>

        {/* Dynamic Telemetry Tag: UP trains float ABOVE, DOWN trains float BELOW */}
        <div
          className={`absolute flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-950/95 backdrop-blur-md border ${palette.tagBorder} text-[8px] font-mono whitespace-nowrap shadow-lg pointer-events-none ${
            isUp ? '-top-5' : '-bottom-5'
          }`}
        >
          <span className={`font-extrabold ${palette.pillSpeed}`}>
            {speedKmh > 0 ? `${speedKmh.toFixed(0)}k` : 'HALT'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">KM {currentKm.toFixed(0)}</span>
          <span className="text-slate-500">•</span>
          <span className={`font-black ${delayMinutes <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {delayMinutes <= 0 ? 'RT' : `+${delayMinutes}m`}
          </span>
        </div>
      </button>

      {/* Floating Detailed Hover Card */}
      {(showTooltip || isSelected) && (
        <div className="absolute left-1/2 top-8 -translate-x-1/2 z-50 w-64 bg-slate-950/98 backdrop-blur-xl border border-cyan-500/70 rounded-xl p-3 shadow-2xl space-y-2 pointer-events-none font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm">#{trainNumber}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${palette.badge}`}>
                {palette.label}
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                !isUp
                  ? 'bg-cyan-950 text-[#00BFFF] border border-cyan-500/40'
                  : 'bg-emerald-950 text-[#00FF41] border border-emerald-500/40'
              }`}
            >
              {isUp ? 'UP (CNB → NDLS)' : 'DOWN (NDLS → CNB)'}
            </span>
          </div>

          <p className="text-slate-100 font-sans text-xs font-bold leading-tight line-clamp-2">
            {trainName}
          </p>

          <div className="space-y-1 text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-control-muted">Current Location:</span>
              <span className="text-white font-bold">KM {currentKm.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Live Speed:</span>
              <span className={`font-extrabold ${palette.pillSpeed}`}>{speedKmh.toFixed(1)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Corridor Section:</span>
              <span className="text-cyan-300 truncate max-w-[140px]">{currentSection}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Schedule Status:</span>
              <span className={delayMinutes <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {delayMinutes <= 0 ? 'ON TIME (Right Time)' : `DELAYED BY ${delayMinutes} MIN`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
