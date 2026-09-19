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
      <svg className="w-full h-full" viewBox="0 0 1400 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="upLineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="downLineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
          </linearGradient>

          <filter id="trackGlow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Track Glow (UP Line) */}
        <path
          d="M 60,350 C 180,345 320,360 480,395 S 720,445 920,435 S 1180,410 1340,390"
          fill="none"
          stroke="url(#upLineGlow)"
          strokeWidth="8"
          filter="url(#trackGlow)"
          opacity="0.3"
        />

        {/* UP Line Main Track (Thick High-Speed Rail) */}
        <path
          d="M 60,350 C 180,345 320,360 480,395 S 720,445 920,435 S 1180,410 1340,390"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="4.5"
          className="pointer-events-auto cursor-pointer hover:stroke-[6] transition-all"
        />

        {/* Railroad Sleepers/Ties along UP line */}
        <path
          d="M 60,350 C 180,345 320,360 480,395 S 720,445 920,435 S 1180,410 1340,390"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeDasharray="2 12"
          opacity="0.35"
        />

        {/* DOWN Line Parallel Main Track (Offset +20px) */}
        <path
          d="M 60,370 C 180,365 320,380 480,415 S 720,465 920,455 S 1180,430 1340,410"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="3.5"
          className="pointer-events-auto cursor-pointer hover:stroke-[5] transition-all"
        />
        <path
          d="M 60,370 C 180,365 320,380 480,415 S 720,465 920,455 S 1180,430 1340,410"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray="2 12"
          opacity="0.25"
        />

        {/* Third Track: Dedicated Freight / Siding Loop (SBB to GZB & MIU) */}
        <path
          d="M 850,470 C 960,480 1100,470 1340,440"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          opacity="0.6"
        />

        {/* Dynamic Section Health Status Indicators */}
        {/* SEC-01: NDLS - TKJ (Clear) */}
        <path
          d="M 60,350 C 140,346 220,348 280,356"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.5"
          opacity="0.8"
        />

        {/* SEC-02: TKJ - ANVT (Clear) */}
        <path
          d="M 280,356 C 360,370 480,395 620,418"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.5"
          opacity="0.8"
        />

        {/* SEC-03: ANVT - SBB (Active/Coordinated Zone) */}
        <path
          d="M 620,418 C 720,438 820,448 940,442"
          fill="none"
          stroke="#a855f7"
          strokeWidth="4"
          strokeDasharray="8 4"
          className="animate-pulse"
        />

        {/* SEC-04: SBB - GZB (Caution Zone) */}
        <path
          d="M 940,442 C 1040,434 1140,422 1220,414"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3.5"
          strokeDasharray="6 3"
        />

        {/* Text Track Labels */}
        <text x="80" y="330" fill="#06b6d4" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.8">
          ▲ UP MAIN LINE (MAX 130 KM/H)
        </text>
        <text x="80" y="395" fill="#8b5cf6" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.7">
          ▼ DOWN MAIN LINE (MAX 130 KM/H)
        </text>
        <text x="960" y="495" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.8">
          ● EDFC FREIGHT CORRIDOR LOOP
        </text>
      </svg>
    </div>
  );
};
