import React from 'react';
import { useMapStore } from '../../stores/mapStore';
import {
  Layers,
  Train,
  Wrench,
  AlertTriangle,
  Radio,
  Eye,
  RotateCcw,
  Compass,
  MapPin,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Cpu,
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
}) => {
  const {
    showTrains,
    showBlocks,
    showHeatmap,
    showSignals,
    toggleLayer,
    resetViewport,
  } = useMapStore();

  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-2.5 font-mono text-xs select-none">
      {/* Primary Simulation Suite Trigger Button */}
      {onOpenSimulator && (
        <button
          type="button"
          onClick={onOpenSimulator}
          className="w-52 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-400/50 transition animate-pulse"
        >
          <Sparkles className="w-4 h-4 fill-cyan-200 text-cyan-200" />
          <span className="tracking-tight text-[11px]">AI কনফ্লিক্ট সিমুলেটর</span>
        </button>
      )}

      {/* Canvas Viewport Zoom & Fullscreen Panel */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-control-border rounded-xl p-2.5 shadow-2xl space-y-2 w-52">
        <div className="flex items-center justify-between text-control-muted pb-1 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
          <span>Viewport Zoom & Screen</span>
          <span className="text-cyan-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom"
            className="p-1.5 rounded-lg border border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition text-[10px] font-bold"
          >
            1x
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen / বড় করুন'}
              className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                isFullscreen
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                  : 'border-slate-800 bg-control-bg hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      {/* Floating HUD Layer Toggles Panel */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-control-border rounded-xl p-3 shadow-2xl space-y-2.5 w-52">
        <div className="flex items-center justify-between text-control-muted pb-1.5 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telemetry Layers</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Trains toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('showTrains')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              showTrains
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                : 'bg-control-bg/60 border-slate-800 text-control-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <Train className="w-3.5 h-3.5" />
              <span>Live Trains</span>
            </span>
            <span className="text-[10px] font-bold">{showTrains ? 'ON' : 'OFF'}</span>
          </button>

          {/* Blocks toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('showBlocks')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              showBlocks
                ? 'bg-blue-950/70 border-blue-500/50 text-blue-300'
                : 'bg-control-bg/60 border-slate-800 text-control-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              <span>Track Possessions</span>
            </span>
            <span className="text-[10px] font-bold">{showBlocks ? 'ON' : 'OFF'}</span>
          </button>

          {/* USFD Defect Heatmap toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('showHeatmap')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              showHeatmap
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                : 'bg-control-bg/60 border-slate-800 text-control-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>USFD Flaw Heatmap</span>
            </span>
            <span className="text-[10px] font-bold">{showHeatmap ? 'ON' : 'OFF'}</span>
          </button>

          {/* Signals toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('showSignals')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              showSignals
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-control-bg/60 border-slate-800 text-control-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5" />
              <span>Stations & Interlock</span>
            </span>
            <span className="text-[10px] font-bold">{showSignals ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Perspective & Quick Navigation Controls */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-control-border rounded-xl p-3 shadow-2xl space-y-2.5 w-52">
        <div className="flex items-center justify-between text-control-muted pb-1.5 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Perspective & Presets</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {/* 2D / 3D Toggle */}
          <button
            type="button"
            onClick={onToggle3D}
            className={`w-full py-1.5 px-2.5 rounded-lg border text-center font-bold transition ${
              is3D
                ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 shadow-md'
                : 'bg-control-bg/60 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {is3D ? '3D PERSPECTIVE (45°)' : '2D OVERHEAD (0°)'}
          </button>

          {/* Corridor Presets */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
            <button
              type="button"
              onClick={() => onSelectPreset('FULL')}
              className="py-1 px-1.5 rounded border border-slate-800 bg-control-bg hover:border-cyan-500/40 hover:text-cyan-300 text-control-muted"
            >
              Full Corridor
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('NDLS')}
              className="py-1 px-1.5 rounded border border-slate-800 bg-control-bg hover:border-cyan-500/40 hover:text-cyan-300 text-control-muted"
            >
              NDLS Yard
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('SBB')}
              className="py-1 px-1.5 rounded border border-slate-800 bg-control-bg hover:border-cyan-500/40 hover:text-cyan-300 text-control-muted"
            >
              Sahibabad (Possession)
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('GZB')}
              className="py-1 px-1.5 rounded border border-slate-800 bg-control-bg hover:border-cyan-500/40 hover:text-cyan-300 text-control-muted"
            >
              Ghaziabad Jn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
