import React from 'react';
import { TrackSectionGeo } from '../../services/mapGeoData';

interface SectionLayerProps {
  onSelectSection?: (section: TrackSectionGeo) => void;
}

export const SectionLayer: React.FC<SectionLayerProps> = ({ onSelectSection }) => {
  // SVG viewBox is 1600 x 700
  // Spline starts at X=64 (4%), ends at X=1536 (96%)
  // Center is at X=800 (50%)
  // Formula: Y = 350 + Math.sin(p * Math.PI) * 98
  // Quadratic control point for exact peak at Y=448 is at Q 800, 546
  // UP Line offset: -14px (Y=336 to 434) -> Q 800, 532
  // DOWN Line offset: +14px (Y=364 to 462) -> Q 800, 560

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none">
      <svg className="w-full h-full" viewBox="0 0 1600 700" preserveAspectRatio="none">
        <defs>
          {/* UP Line Real Indian Railways COA Bright Green Glow */}
          <linearGradient id="coaUpGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00FF41" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#00FF41" stopOpacity="0.85" />
          </linearGradient>

          {/* DOWN Line Real Indian Railways COA Electric Blue Glow */}
          <linearGradient id="coaDownGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.85" />
          </linearGradient>

          <filter id="trackGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3.0" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Track Bed Clear Sections (Dark Green Standard) */}
        <path
          d="M 64,336 Q 800,532 1536,336"
          fill="none"
          stroke="#006622"
          strokeWidth="14"
          opacity="0.3"
        />

        {/* ------------------------------------------------------------- */}
        {/* UP MAIN LINE: Real Indian Railways COA Standard Bright Green   */}
        {/* Direction: ← TO NEW DELHI (NDLS)                             */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 64,336 Q 800,532 1536,336"
          fill="none"
          stroke="url(#coaUpGlow)"
          strokeWidth="6"
          filter="url(#trackGlow)"
          opacity="0.4"
        />
        <path
          d="M 64,336 Q 800,532 1536,336"
          fill="none"
          stroke="#00FF41"
          strokeWidth="3.5"
          className="pointer-events-auto cursor-pointer"
        />
        {/* Railroad Sleepers along UP line */}
        <path
          d="M 64,336 Q 800,532 1536,336"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray="2 12"
          opacity="0.25"
        />

        {/* ------------------------------------------------------------- */}
        {/* DOWN MAIN LINE: Real Indian Railways COA Electric Blue        */}
        {/* Direction: TO KANPUR CENTRAL (CNB) →                          */}
        {/* ------------------------------------------------------------- */}
        <path
          d="M 64,364 Q 800,560 1536,364"
          fill="none"
          stroke="url(#coaDownGlow)"
          strokeWidth="6"
          filter="url(#trackGlow)"
          opacity="0.4"
        />
        <path
          d="M 64,364 Q 800,560 1536,364"
          fill="none"
          stroke="#00BFFF"
          strokeWidth="3.5"
          className="pointer-events-auto cursor-pointer"
        />
        {/* Railroad Sleepers along DOWN line */}
        <path
          d="M 64,364 Q 800,560 1536,364"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeDasharray="2 12"
          opacity="0.25"
        />

        {/* ------------------------------------------------------------- */}
        {/* LOOP LINES & FREIGHT FEEDER: Yellow (#FFD700) Dashed Lines   */}
        {/* ------------------------------------------------------------- */}
        {/* Loop 1: Delhi-Ghaziabad Siding / EDFC Feeder */}
        <path
          d="M 146,384 Q 280,410 486,438"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          opacity="0.75"
        />
        {/* Loop 2: Tundla Yard Siding */}
        <path
          d="M 680,470 Q 747,485 820,480"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          opacity="0.75"
        />
        {/* Loop 3: Kanpur Freight Yard Siding */}
        <path
          d="M 1350,400 Q 1440,380 1536,375"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          opacity="0.75"
        />

        {/* ------------------------------------------------------------- */}
        {/* KILOMETRIC CHAINAGE TICKS (Exact Formula: X = 64 + (KM/440.2)*1472) */}
        {/* ------------------------------------------------------------- */}
        {[
          { km: 0, x: 64, label: 'NDLS 0K' },
          { km: 24.5, x: 146, label: 'GZB 25K' },
          { km: 50, x: 231, label: '50K' },
          { km: 100, x: 398, label: '100K' },
          { km: 126.1, x: 486, label: 'ALJN 126K' },
          { km: 150, x: 566, label: '150K' },
          { km: 200, x: 733, label: '200K' },
          { km: 204.3, x: 747, label: 'TDL 204K' },
          { km: 250, x: 900, label: '250K' },
          { km: 296.8, x: 1056, label: 'ETW 297K' },
          { km: 350, x: 1234, label: '350K' },
          { km: 400, x: 1401, label: '400K' },
          { km: 440.2, x: 1536, label: 'CNB 440K' },
        ].map((tick) => {
          // Calculate track Y at this X point to place ticks nicely below the track
          const p = tick.km / 440.2;
          const yTrack = 364 + Math.sin(p * Math.PI) * 98;
          return (
            <g key={tick.label} opacity="0.6">
              <line x1={tick.x} y1={yTrack + 28} x2={tick.x} y2={yTrack + 36} stroke="#475569" strokeWidth="1.5" />
              <text
                x={tick.x}
                y={yTrack + 48}
                fill="#94A3B8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {tick.label}
              </text>
            </g>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* DIRECTION AND LINE FLOW WATERMARKS                            */}
        {/* ------------------------------------------------------------- */}
        <text
          x="75"
          y="312"
          fill="#00FF41"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="extrabold"
          letterSpacing="1"
        >
          &larr; UP MAIN LINE (TO NEW DELHI • 130 KM/H)
        </text>

        <text
          x="75"
          y="400"
          fill="#00BFFF"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="extrabold"
          letterSpacing="1"
        >
          &rarr; DOWN MAIN LINE (TO KANPUR CENTRAL • 130 KM/H)
        </text>
      </svg>
    </div>
  );
};
