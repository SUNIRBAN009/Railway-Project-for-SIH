import React from 'react';
import { TRACK_SECTIONS, TrackSectionGeo } from '../../services/mapGeoData';

interface SectionLayerProps {
  onSelectSection?: (section: TrackSectionGeo) => void;
}

export const SectionLayer: React.FC<SectionLayerProps> = ({ onSelectSection }) => {
  const getSectionStroke = (status: string) => {
    switch (status) {
      case 'POSSESSION':
        return '#f43f5e'; // Rose-500
      case 'CAUTION':
        return '#f59e0b'; // Amber-500
      case 'CLEAR':
      default:
        return '#10b981'; // Emerald-500
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg className="w-full h-full">
        <defs>
          <linearGradient id="upLineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
          <filter id="trackGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base Background Track Glow Line (UP Line) */}
        <path
          d="M 60,340 C 180,335 280,350 420,380 S 600,430 760,425 S 960,420 1150,410"
          fill="none"
          stroke="url(#upLineGlow)"
          strokeWidth="6"
          filter="url(#trackGlow)"
          opacity="0.4"
        />

        {/* Segment 1: NDLS - TKJ (Clear - Green) */}
        <path
          d="M 60,340 C 120,338 180,336 220,342"
          fill="none"
          stroke={getSectionStroke('CLEAR')}
          strokeWidth="4"
          className="pointer-events-auto cursor-pointer hover:stroke-[6] transition-all"
        />

        {/* Segment 2: TKJ - ANVT (Clear - Green) */}
        <path
          d="M 220,342 C 280,350 360,365 480,395"
          fill="none"
          stroke={getSectionStroke('CLEAR')}
          strokeWidth="4"
          className="pointer-events-auto cursor-pointer hover:stroke-[6] transition-all"
        />

        {/* Segment 3: ANVT - SBB (Possession Active - Red) */}
        <path
          d="M 480,395 C 560,415 640,430 740,427"
          fill="none"
          stroke={getSectionStroke('POSSESSION')}
          strokeWidth="5"
          strokeDasharray="6 3"
          className="pointer-events-auto cursor-pointer hover:stroke-[7] transition-all animate-pulse"
        />

        {/* Segment 4: SBB - GZB (Caution Order - Yellow) */}
        <path
          d="M 740,427 C 840,424 940,420 1060,414"
          fill="none"
          stroke={getSectionStroke('CAUTION')}
          strokeWidth="4"
          className="pointer-events-auto cursor-pointer hover:stroke-[6] transition-all"
        />

        {/* DOWN Line Parallel (Offset by +12px) */}
        <path
          d="M 60,352 C 180,347 280,362 420,392 S 600,442 760,437 S 960,432 1150,422"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          opacity="0.7"
        />
      </svg>
    </div>
  );
};
