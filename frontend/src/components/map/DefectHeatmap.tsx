import React, { useState } from 'react';
import { USFD_DEFECT_POINTS, USFDDefectPoint } from '../../services/mapGeoData';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const DefectHeatmap: React.FC = () => {
  const [hoveredPoint, setHoveredPoint] = useState<USFDDefectPoint | null>(null);

  // Position relative percentages for 3 demo USFD points:
  // KM 7.5 -> 28% X
  // KM 14.8 -> 58% X
  // KM 20.2 -> 82% X
  const defectPositions = [
    { point: USFD_DEFECT_POINTS[2], xPercent: 28, yPercent: 49 },
    { point: USFD_DEFECT_POINTS[0], xPercent: 58, yPercent: 53 },
    { point: USFD_DEFECT_POINTS[1], xPercent: 82, yPercent: 51 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-18">
      {defectPositions.map(({ point, xPercent, yPercent }) => {
        const isCritical = point.flawSeverity === 'CRITICAL';

        return (
          <div
            key={point.id}
            style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            onMouseEnter={() => setHoveredPoint(point)}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Pulsing Radial Heatmap Aura */}
            <div
              className={`rounded-full animate-ping pointer-events-none ${
                isCritical
                  ? 'w-12 h-12 bg-rose-600/30'
                  : 'w-9 h-9 bg-amber-500/25'
              }`}
            />

            {/* Core Flaw Pin */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg ${
                isCritical
                  ? 'bg-rose-600 border-white text-white shadow-rose-950 ring-2 ring-rose-500/50'
                  : 'bg-amber-500 border-white text-black shadow-amber-950'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
            </div>

            {/* Tooltip Card */}
            {hoveredPoint?.id === point.id && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-64 bg-slate-950/95 backdrop-blur-md border border-rose-500/60 rounded-xl p-3 shadow-2xl font-mono text-xs space-y-1.5 pointer-events-none">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-[10px] text-rose-400 font-extrabold uppercase">
                    USFD RAIL FLAW DETECTED
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-500/50">
                    KM {point.kmPost.toFixed(1)}
                  </span>
                </div>

                <p className="text-white font-bold font-sans text-xs">{point.flawType}</p>

                <div className="space-y-0.5 text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
                  <div>Detected: <strong className="text-slate-200">{point.detectionDate}</strong></div>
                  <div>Containment: <strong className="text-emerald-400">{point.containmentStatus}</strong></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
