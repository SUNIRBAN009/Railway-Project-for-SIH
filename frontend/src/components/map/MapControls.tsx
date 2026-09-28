import React from 'react';
import { useMapStore } from '../../stores/mapStore';
import {
  Layers,
  Train,
  Wrench,
  AlertTriangle,
  Radio,
  Eye,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface MapControlsProps {
  is3D: boolean;
  onToggle3D: () => void;
  onSelectPreset: (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB') => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onOpenSimulator?: () => void;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  is3D,
  onToggle3D,
  onSelectPreset,
  isFullscreen,
  onToggleFullscreen,
  zoomLevel = 1.0,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenSimulator,
  className,
}) => {
  const {
    showTrains,
    showBlocks,
    showHeatmap,
    showSignals,
    toggleLayer,
  } = useMapStore();

  return (
    <div
      className={
        className ||
        'w-full bg-slate-950/95 backdrop-blur-xl border border-control-border rounded-2xl p-4 shadow-2xl font-mono text-xs select-none'
      }
    >
      {/* Header Strip with Unobstructed Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
              Corridor Display & Telemetry Controls
              <span className="px-2 py-0.5 text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                100% UNRESTRICTED MAP VIEW
              </span>
            </h3>
            <p className="text-[11px] text-control-muted mt-0.5">
              NDLS – CNB Quad-Track Digital Twin Controls • Live Layer Toggles & Camera Presets
            </p>
          </div>
        </div>

        {/* Global Status Badges */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-control-muted">
            Viewport Zoom: <strong className="text-cyan-400">{Math.round(zoomLevel * 100)}%</strong>
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-control-muted">
            Pitch: <strong className="text-purple-300">{is3D ? '3D Isometric (45°)' : '2D Overhead (0°)'}</strong>
          </span>
          {onOpenSimulator && (
            <button
              type="button"
              onClick={onOpenSimulator}
              className="py-1 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-md transition"
            >
              <Sparkles className="w-3.5 h-3.5 fill-cyan-200 text-cyan-200" />
              <span>AI Simulator</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Responsive Grid (No overlay blocking the map!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel 1: Telemetry Layers */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Telemetry Layers</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {[showTrains, showBlocks, showHeatmap, showSignals].filter(Boolean).length}/4 ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Live Trains Toggle */}
            <button
              type="button"
              onClick={() => toggleLayer('showTrains')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                showTrains
                  ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-sm'
                  : 'bg-control-bg/60 border-slate-800 text-control-muted hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Train className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Live Trains</span>
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${showTrains ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                {showTrains ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Track Possessions Toggle */}
            <button
              type="button"
              onClick={() => toggleLayer('showBlocks')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                showBlocks
                  ? 'bg-blue-950/70 border-blue-500/60 text-blue-300 shadow-sm'
                  : 'bg-control-bg/60 border-slate-800 text-control-muted hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Track Possessions</span>
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${showBlocks ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                {showBlocks ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* USFD Defect Heatmap Toggle */}
            <button
              type="button"
              onClick={() => toggleLayer('showHeatmap')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                showHeatmap
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 shadow-sm'
                  : 'bg-control-bg/60 border-slate-800 text-control-muted hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">USFD Heatmap</span>
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${showHeatmap ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                {showHeatmap ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Stations & Interlock Toggle */}
            <button
              type="button"
              onClick={() => toggleLayer('showSignals')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                showSignals
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-control-bg/60 border-slate-800 text-control-muted hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Interlocking</span>
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${showSignals ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {showSignals ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Panel 2: Perspective & Corridor Presets */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>Perspective & Presets</span>
            </span>
            <button
              type="button"
              onClick={onToggle3D}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                is3D
                  ? 'bg-purple-950 border-purple-500/60 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {is3D ? '3D ISOMETRIC' : '2D OVERHEAD'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onSelectPreset('FULL')}
              className="py-2 px-2.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 hover:text-cyan-300 text-slate-300 flex items-center justify-between transition group"
            >
              <span className="font-semibold">Full Corridor</span>
              <span className="text-[10px] text-control-muted group-hover:text-cyan-400 font-mono">0–32 KM</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('NDLS')}
              className="py-2 px-2.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 hover:text-cyan-300 text-slate-300 flex items-center justify-between transition group"
            >
              <span className="font-semibold">NDLS Yard</span>
              <span className="text-[10px] text-control-muted group-hover:text-cyan-400 font-mono">KM 0.0</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('SBB')}
              className="py-2 px-2.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 hover:text-cyan-300 text-slate-300 flex items-center justify-between transition group"
            >
              <span className="font-semibold">Sahibabad</span>
              <span className="text-[10px] text-control-muted group-hover:text-cyan-400 font-mono">KM 13.0</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('GZB')}
              className="py-2 px-2.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 hover:text-cyan-300 text-slate-300 flex items-center justify-between transition group"
            >
              <span className="font-semibold">Ghaziabad Jn</span>
              <span className="text-[10px] text-control-muted group-hover:text-cyan-400 font-mono">KM 20.0</span>
            </button>
          </div>
        </div>

        {/* Panel 3: Viewport Zoom & Canvas Controls */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] uppercase font-bold tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Viewport Zoom & Screen</span>
            </span>
            <span className="text-cyan-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onZoomIn}
              title="Zoom In"
              className="py-2 px-2 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 transition"
            >
              <ZoomIn className="w-4 h-4" />
              <span className="text-[10px] font-bold">+10%</span>
            </button>

            <button
              type="button"
              onClick={onZoomOut}
              title="Zoom Out"
              className="py-2 px-2 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 transition"
            >
              <ZoomOut className="w-4 h-4" />
              <span className="text-[10px] font-bold">-10%</span>
            </button>

            <button
              type="button"
              onClick={onResetZoom}
              title="Reset Zoom to 100%"
              className="py-2 px-2 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex flex-col items-center justify-center gap-1 transition"
            >
              <span className="text-xs font-extrabold text-cyan-400">1x</span>
              <span className="text-[10px] font-bold">Default</span>
            </button>

            {onToggleFullscreen ? (
              <button
                type="button"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className={`py-2 px-2 rounded-lg border transition flex flex-col items-center justify-center gap-1 ${
                  isFullscreen
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="text-[10px] font-bold">{isFullscreen ? 'Exit' : 'Full'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggle3D}
                title="Toggle 2D/3D Pitch"
                className="py-2 px-2 rounded-lg border border-slate-800 bg-control-bg hover:border-purple-500/50 text-purple-300 flex flex-col items-center justify-center gap-1 transition"
              >
                <Compass className="w-4 h-4" />
                <span className="text-[10px] font-bold">{is3D ? '3D' : '2D'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
