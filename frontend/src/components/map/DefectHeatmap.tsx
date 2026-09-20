import React, { useState } from 'react';
import { useRiskMatrix } from '../../hooks/useRiskMatrix';
import { DefectItem } from '../../services/api';
import { USFD_DEFECT_POINTS } from '../../services/mapGeoData';
import { AlertTriangle, AlertOctagon, Sparkles } from 'lucide-react';
import { RiskColorChip } from '../common/RiskColorChip';

export const DefectHeatmap: React.FC = () => {
  const [hoveredDefect, setHoveredDefect] = useState<DefectItem | null>(null);
  const { rankedDefects } = useRiskMatrix();

  // If live defects exist from backend, map them; otherwise fall back to demo points
  const activeItems: Array<{
    id: string;
    defectCode: string;
    assetTag: string;
    kmPost: number;
    flawType: string;
    category: 'EXTREME_RISK' | 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
    score: number;
    cof: number;
    lof: number;
    overdueDays: number;
    flawDepth?: number | null;
    raw?: DefectItem;
    xPercent: number;
    yPercent: number;
  }> = (rankedDefects && rankedDefects.length > 0)
    ? rankedDefects.map((d) => {
        const totalKm = 440.2;
        const p = Math.max(0.0, Math.min(1.0, d.location_km / totalKm));
        const x = 6 + p * 88;
        const y = 50 + Math.sin(p * Math.PI) * 14;
        return {
          id: d.id,
          defectCode: d.defect_code,
          assetTag: d.asset_tag,
          kmPost: d.location_km,
          flawType: d.defect_type_display || d.defect_type,
          category: d.category,
          score: d.final_risk_score,
          cof: d.cof_score,
          lof: d.lof_score,
          overdueDays: d.overdue_days,
          flawDepth: d.flaw_depth_mm,
          raw: d,
          xPercent: x,
          yPercent: y,
        };
      })
    : [
        {
          id: 'demo-1',
          defectCode: 'DEF-USFD-014',
          assetTag: 'AST-NDLS-GZB-014',
          kmPost: 14.8,
          flawType: 'Internal Rail Fatigue / Transverse Fissure',
          category: 'EXTREME_RISK' as const,
          score: 25.0,
          cof: 5,
          lof: 5,
          overdueDays: 28,
          flawDepth: 14.2,
          xPercent: 58,
          yPercent: 53,
        },
        {
          id: 'demo-2',
          defectCode: 'DEF-WHEEL-020',
          assetTag: 'AST-GZB-ALJN-082',
          kmPost: 20.2,
          flawType: 'Wheel Burn / Scabbing',
          category: 'HIGH_RISK' as const,
          score: 15.0,
          cof: 4,
          lof: 3,
          overdueDays: 14,
          flawDepth: 8.5,
          xPercent: 82,
          yPercent: 51,
        },
        {
          id: 'demo-3',
          defectCode: 'DEF-OHE-007',
          assetTag: 'AST-NDLS-007',
          kmPost: 7.5,
          flawType: 'Excessive Contact Wire Sag',
          category: 'MEDIUM_RISK' as const,
          score: 7.5,
          cof: 2,
          lof: 3,
          overdueDays: 5,
          flawDepth: null,
          xPercent: 28,
          yPercent: 49,
        },
      ];

  return (
    <div className="absolute inset-0 pointer-events-none z-18">
      {activeItems.map((item) => {
        const isExtreme = item.category === 'EXTREME_RISK';
        const isHigh = item.category === 'HIGH_RISK';

        return (
          <div
            key={item.id}
            style={{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            onMouseEnter={() => item.raw && setHoveredDefect(item.raw)}
            onMouseLeave={() => setHoveredDefect(null)}
          >
            {/* Pulsing Radial Heatmap Aura */}
            <div
              className={`rounded-full animate-ping pointer-events-none ${
                isExtreme
                  ? 'w-14 h-14 bg-rose-600/35'
                  : isHigh
                  ? 'w-10 h-10 bg-amber-500/30'
                  : 'w-8 h-8 bg-yellow-500/20'
              }`}
            />

            {/* Core Flaw Pin */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-125 ${
                isExtreme
                  ? 'bg-rose-600 border-white text-white shadow-rose-950 ring-2 ring-rose-500/60'
                  : isHigh
                  ? 'bg-amber-500 border-white text-black shadow-amber-950 ring-1 ring-amber-400'
                  : 'bg-yellow-500 border-white text-black shadow-yellow-950'
              }`}
            >
              {isExtreme ? (
                <AlertOctagon className="w-2.5 h-2.5" />
              ) : (
                <AlertTriangle className="w-2.5 h-2.5" />
              )}
            </div>

            {/* Tooltip Card */}
            {hoveredDefect?.id === item.id && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-72 bg-slate-950/95 backdrop-blur-md border border-rose-500/70 rounded-xl p-3.5 shadow-2xl font-mono text-xs space-y-2 pointer-events-none">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] text-rose-400 font-extrabold uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>DEFECT #{item.defectCode}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-cyan-300 border border-slate-700">
                    KM {item.kmPost.toFixed(3)}
                  </span>
                </div>

                <div>
                  <p className="text-white font-bold font-sans text-xs">{item.flawType}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.assetTag}</p>
                </div>

                <div className="pt-1">
                  <RiskColorChip
                    category={item.category}
                    score={item.score}
                    cof={item.cof}
                    lof={item.lof}
                    overdueDays={item.overdueDays}
                    size="sm"
                  />
                </div>

                {item.raw?.why_explanation && (
                  <p className="text-[10px] text-slate-300 font-sans italic border-t border-slate-800 pt-1 leading-tight">
                    {item.raw.why_explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

