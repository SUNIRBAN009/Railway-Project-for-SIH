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
} from 'lucide-react';

interface MapControlsProps {
  is3D: boolean;
  onToggle3D: () => void;
  onSelectPreset: (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB') => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  is3D,
  onToggle3D,
  onSelectPreset,
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
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-3 font-mono text-xs select-none">
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
