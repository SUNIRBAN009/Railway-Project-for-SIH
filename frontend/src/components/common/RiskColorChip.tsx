import React from 'react';
import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export type RiskLevel = 'EXTREME_RISK' | 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | string;

interface RiskColorChipProps {
  category?: RiskLevel;
  score?: number;
  cof?: number;
  lof?: number;
  overdueDays?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskColorChip: React.FC<RiskColorChipProps> = ({
  category = 'LOW_RISK',
  score,
  cof,
  lof,
  overdueDays,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const normalizedCat = (category || 'LOW_RISK').toUpperCase();

  const getStyle = () => {
    switch (normalizedCat) {
      case 'EXTREME_RISK':
        return {
          bg: 'bg-rose-500/15 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30',
          dot: 'bg-rose-500 shadow-rose-500/50',
          label: 'EXTREME RISK',
          icon: AlertOctagon,
        };
      case 'HIGH_RISK':
        return {
          bg: 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30',
          dot: 'bg-amber-500 shadow-amber-500/50',
          label: 'HIGH RISK',
          icon: AlertTriangle,
        };
      case 'MEDIUM_RISK':
        return {
          bg: 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300',
          dot: 'bg-yellow-500',
          label: 'MEDIUM RISK',
          icon: Info,
        };
      case 'LOW_RISK':
      default:
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'LOW RISK',
          icon: ShieldAlert,
        };
    }
  };

  const style = getStyle();
  const IconComponent = style.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <div className="inline-flex items-center flex-wrap gap-1.5">
      {/* Category Badge */}
      <span
        className={`inline-flex items-center rounded-md font-mono font-bold uppercase border transition-all ${style.bg} ${sizeClasses} ${className}`}
      >
        {normalizedCat === 'EXTREME_RISK' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
          </span>
        ) : (
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
        )}

        {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
        <span>{style.label}</span>

        {score !== undefined && (
          <span className="ml-1 px-1 rounded bg-black/40 text-white font-mono text-[11px]">
            {score.toFixed(1)}
          </span>
        )}
      </span>

      {/* CoF x LoF Breakdown Chip */}
      {cof !== undefined && lof !== undefined && (
        <span
          className={`inline-flex items-center rounded-md font-mono text-[10px] px-2 py-0.5 bg-slate-900/80 border border-slate-700/70 text-slate-300 ${
            size === 'sm' ? 'text-[9px] px-1' : ''
          }`}
          title={`Consequence of Failure (${cof}/5) x Likelihood of Failure (${lof}/5)`}
        >
          <span className="text-slate-400 font-semibold mr-0.5">CoF</span>
          <strong className="text-white">{cof}</strong>
          <span className="text-slate-500 mx-0.5">×</span>
          <span className="text-slate-400 font-semibold mr-0.5">LoF</span>
          <strong className="text-white">{lof}</strong>
        </span>
      )}

      {/* Overdue Days Badge */}
      {overdueDays !== undefined && overdueDays > 0 && (
        <span
          className={`inline-flex items-center rounded-md font-mono text-[10px] px-2 py-0.5 ${
            overdueDays >= 20
              ? 'bg-rose-950/60 border border-rose-600/60 text-rose-300'
              : overdueDays >= 10
              ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
              : 'bg-slate-800 border border-slate-700 text-slate-300'
          }`}
        >
          ⏰ {overdueDays}d overdue
        </span>
      )}
    </div>
  );
};
