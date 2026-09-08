import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-lg',
}) => {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      style={style}
      className={`bg-slate-800/60 animate-pulse ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-control-border bg-control-panel/80 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="w-24 h-3.5" />
                <Skeleton className="w-16 h-2.5" />
              </div>
            </div>
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
          <Skeleton className="w-full h-10 rounded-lg" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="w-32 h-3" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full border border-control-border rounded-xl overflow-hidden bg-control-panel">
      {/* Header */}
      <div className="border-b border-control-border p-4 bg-slate-900/60 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-control-border/60 p-2 space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MapSkeleton: React.FC = () => {
  return (
    <div className="w-full h-[600px] border border-control-border rounded-2xl bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
      <Skeleton className="w-48 h-4 mb-2" />
      <Skeleton className="w-72 h-3" />
    </div>
  );
};
