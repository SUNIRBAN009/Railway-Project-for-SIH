import React, { useState } from 'react';
import { LiveMapTrain } from '../../services/mapGeoData';
import { LiveTrainRecord } from '../../services/api';
import { Navigation, Clock, Activity, Users, ArrowUpRight, ArrowDownRight, Compass, ShieldAlert } from 'lucide-react';

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

  // Normalize field names across LiveMapTrain and LiveTrainRecord
  const trainNumber = ('train_number' in train ? train.train_number : train.trainNumber) || 'TRN';
  const trainName = ('train_name' in train ? train.train_name : train.trainName) || 'Corridor Express';
  const speedKmh = Number(('speed_kmh' in train ? train.speed_kmh : train.speedKmh) || 0);
  const delayMinutes = Number(('delay_minutes' in train ? train.delay_minutes : train.delayMinutes) || 0);
  const rawType = ('train_type' in train ? train.train_type : train.type) || 'EXPRESS';
  const direction = (('direction' in train ? train.direction : train.lineType) || 'DOWN').toUpperCase();
  const currentSection = ('current_section' in train ? train.current_section : train.currentSection) || 'Golden Corridor Trunk';
  const currentKm = Number(('current_km' in train ? train.current_km : 0));
  const paxCapacity = Number(('pax_capacity' in train ? train.pax_capacity : undefined) ?? (rawType === 'FREIGHT' ? 0 : 1200));

  // Heading calculation
  const heading = train.displayHeading !== undefined ? train.displayHeading : (train.heading ?? (direction === 'DOWN' ? 122 : 302));

  // Determine marker color palette
  const getMarkerPalette = () => {
    if (rawType.includes('PRESTIGE') || rawType === 'SUPERFAST' || trainNumber === '22436' || trainNumber === '12424' || trainNumber === '12301') {
      return {
        bg: 'bg-violet-600 border-cyan-300 text-white shadow-violet-950',
        glow: 'bg-cyan-400/40',
        badge: 'border-cyan-400/60 bg-violet-950/90 text-cyan-300',
        pillSpeed: 'text-cyan-300',
        label: 'PRESTIGE',
      };
    }
    if (rawType.includes('FREIGHT') || trainNumber.startsWith('BOXN') || trainNumber.startsWith('CONT') || trainNumber.startsWith('POL') || trainNumber.startsWith('BCN')) {
      return {
        bg: 'bg-slate-800 border-amber-400 text-amber-300 shadow-slate-950',
        glow: 'bg-amber-400/30',
        badge: 'border-amber-500/50 bg-amber-950/80 text-amber-300',
        pillSpeed: 'text-amber-300',
        label: 'FREIGHT',
      };
    }
    if (rawType.includes('SHATABDI') || trainNumber === '12004') {
      return {
        bg: 'bg-amber-500 border-white text-slate-950 shadow-amber-950',
        glow: 'bg-amber-400/40',
        badge: 'border-amber-400/60 bg-amber-950/90 text-amber-200',
        pillSpeed: 'text-amber-300',
        label: 'SHATABDI',
      };
    }
    return {
      bg: 'bg-emerald-600 border-white text-white shadow-emerald-950',
      glow: 'bg-emerald-400/30',
      badge: 'border-emerald-500/50 bg-emerald-950/80 text-emerald-300',
      pillSpeed: 'text-emerald-300',
      label: 'EXPRESS',
    };
  };

  const palette = getMarkerPalette();

  return (
    <div
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 select-none pointer-events-auto"
      data-testid={`train-marker-${trainNumber}`}
    >
      <button
        type="button"
        onClick={() => onSelect(train)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Train ${trainNumber} (${trainName})`}
        className={`group relative flex items-center justify-center transition-transform duration-75 ${
          isSelected ? 'scale-125' : 'hover:scale-115'
        }`}
      >
        {/* Radar wave ping for active high-speed / running trains */}
        {speedKmh > 0 && (
          <span className={`absolute w-8 h-8 rounded-full ${palette.glow} animate-ping pointer-events-none`} />
        )}

        {/* 60 FPS Rotating Heading Chevron */}
        <div
          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shadow-lg transition-transform duration-75 ${palette.bg}`}
          style={{ transform: `rotate(${heading}deg)` }}
          title={`Heading: ${heading}° (${direction} Line)`}
        >
          <Navigation className="w-3.5 h-3.5 fill-current" />
        </div>

        {/* High-Contrast Live Telemetry Pill Badge (Speed & Delay) */}
        <div className="absolute -top-7 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/95 backdrop-blur-md border border-slate-700 text-[9px] font-mono whitespace-nowrap shadow-lg pointer-events-none">
          {/* Direction indicator */}
          <span className={`text-[8px] font-extrabold px-1 rounded ${direction === 'DOWN' ? 'bg-cyan-950 text-cyan-300' : 'bg-purple-950 text-purple-300'}`}>
            {direction}
          </span>

          <span className="font-extrabold text-white">#{trainNumber}</span>

          {/* Speed badge */}
          <span className={`font-bold ${palette.pillSpeed}`}>
            {speedKmh.toFixed(0)} km/h
          </span>

          {/* Punctuality Badge */}
          <span
            className={`font-bold px-1 rounded ${
              delayMinutes <= 0
                ? 'bg-emerald-950 text-emerald-400'
                : 'bg-amber-950 text-amber-400'
            }`}
          >
            {delayMinutes <= 0 ? 'RT' : `+${delayMinutes}m`}
          </span>
        </div>
      </button>

      {/* Floating Detailed Inspection Card */}
      {(showTooltip || isSelected) && (
        <div className="absolute left-1/2 top-9 -translate-x-1/2 z-50 w-72 bg-slate-950/98 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-3 shadow-2xl space-y-2 pointer-events-none font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm">#{trainNumber}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${palette.badge}`}>
                {palette.label}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${direction === 'DOWN' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-purple-950 text-purple-300 border border-purple-500/40'}`}>
              {direction} LINE
            </span>
          </div>

          <p className="text-slate-100 font-sans text-xs font-bold leading-tight line-clamp-2">
            {trainName}
          </p>

          <div className="space-y-1 text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-control-muted">Live Speed:</span>
              <span className={`font-extrabold ${palette.pillSpeed}`}>{speedKmh.toFixed(1)} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Heading & Compass:</span>
              <span className="text-white font-bold">{heading.toFixed(0)}° ({direction === 'DOWN' ? 'SE NDLS &rarr; CNB' : 'NW CNB &rarr; NDLS'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Corridor Milestone:</span>
              <span className="text-cyan-300 font-bold">KM {currentKm > 0 ? currentKm.toFixed(1) : '—'} / 440.2 KM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Schedule Punctuality:</span>
              <span
                className={`font-bold ${
                  delayMinutes <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {delayMinutes <= 0 ? 'Right Time (RT)' : `Delayed +${delayMinutes} Minutes`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Capacity / Rake:</span>
              <span className="text-slate-200">
                {paxCapacity > 0 ? `${paxCapacity.toLocaleString()} Passengers` : 'Freight Rake'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/60">
              <span className="text-control-muted">Current Section:</span>
              <span className="text-white font-semibold truncate max-w-[150px]">{currentSection}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

