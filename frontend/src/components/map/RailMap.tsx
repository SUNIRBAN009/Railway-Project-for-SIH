import React, { useState, useEffect } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { useBlockStore } from '../../stores/blockStore';
import { SectionLayer } from './SectionLayer';
import { StationNode } from './StationNode';
import { TrainMarker } from './TrainMarker';
import { BlockOverlay } from './BlockOverlay';
import { DefectHeatmap } from './DefectHeatmap';
import { MapControls } from './MapControls';
import {
  DELHI_STATIONS,
  LIVE_MAP_TRAINS,
  LiveMapTrain,
  StationData,
} from '../../services/mapGeoData';
import { Block } from '../../types';
import { AiScenarioSimulator } from './AiScenarioSimulator';
import {
  Radio,
  Compass,
  Layers,
  ShieldCheck,
  Activity,
  Sparkles,
  Train,
  Wrench,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  MapPin,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Play,
  Cpu,
} from 'lucide-react';

interface RailMapProps {
  onSelectBlock?: (block: Block) => void;
}

export const RailMap: React.FC<RailMapProps> = ({ onSelectBlock }) => {
  const {
    showTrains,
    showBlocks,
    showHeatmap,
    showSignals,
    selectedStationCode,
    selectStation,
  } = useMapStore();

  const { blocks, selectedBlockId, setSelectedBlockId } = useBlockStore();

  const [is3D, setIs3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<LiveMapTrain | null>(null);
  const [activeInspectorBlock, setActiveInspectorBlock] = useState<Block | null>(null);
  const [corridorLength, setCorridorLength] = useState<number>(440.2);

  // Fetch live PostGIS SRID 4326 GeoJSON from backend
  useEffect(() => {
    fetch('/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/')
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.data?.properties?.total_length_km) {
          setCorridorLength(resData.data.properties.total_length_km);
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcut: ESC exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 2.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.75));
  const handleResetZoom = () => setZoomLevel(1.0);

  // Synchronize when a block is clicked externally or on overlay
  const handleBlockClick = (block: Block) => {
    setActiveInspectorBlock(block);
    setSelectedBlockId(block.id);
    if (onSelectBlock) {
      onSelectBlock(block);
    }
  };

  // Station Canvas Percentages across the 0–32 KM Delhi-Ghaziabad Quad-Track line
  const stationPercentages: Record<string, { x: number; y: number }> = {
    NDLS: { x: 6, y: 50 },
    CSB: { x: 13, y: 50.5 },
    TKJ: { x: 20, y: 51.5 },
    MWC: { x: 34, y: 54 },
    ANVT: { x: 48, y: 57 },
    CNJ: { x: 58, y: 59 },
    SBB: { x: 68, y: 61 },
    GZB: { x: 84, y: 59 },
    MIU: { x: 94, y: 56 },
  };

  // 8 Simulated Live Moving Trains with Speed Vectors
  const [trainPositions, setTrainPositions] = useState([
    { id: 'trn-map-1', x: 58, y: 58.5, dx: 0.14 }, // Dibrugarh Rajdhani (UP)
    { id: 'trn-map-2', x: 14, y: 50.8, dx: 0.16 }, // Lucknow Shatabdi (UP)
    { id: 'trn-map-3', x: 38, y: 55.0, dx: 0.20 }, // Vande Bharat (UP)
    { id: 'trn-map-4', x: 80, y: 61.5, dx: -0.15 }, // Duronto (DOWN)
    { id: 'trn-map-5', x: 24, y: 52.0, dx: 0.15 }, // Howrah Rajdhani (UP)
    { id: 'trn-map-6', x: 72, y: 63.5, dx: -0.12 }, // Shiv Ganga (DOWN)
    { id: 'trn-map-7', x: 68, y: 65.0, dx: 0 },    // Coal Freight at SBB loop (Stationary)
    { id: 'trn-map-8', x: 89, y: 60.5, dx: 0.10 }, // Container DFC Freight
  ]);

  useEffect(() => {
    // 60 FPS live trajectory interpolation
    const interval = setInterval(() => {
      setTrainPositions((prev) =>
        prev.map((tp) => {
          if (tp.dx === 0) return tp;
          let newX = tp.x + tp.dx;
          let newDx = tp.dx;

          if (newX > 94) {
            newX = 6;
          } else if (newX < 6) {
            newX = 94;
          }

          // Calculate Y along the track curve
          const isDown = newDx < 0;
          const curveY = 50 + Math.sin(((newX - 6) / 88) * Math.PI) * 11;
          const newY = isDown ? curveY + 3.0 : curveY - 0.5;

          return { ...tp, x: newX, y: newY, dx: newDx };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleStationSelect = (station: StationData) => {
    setSelectedStation(station);
    selectStation(station.code);
  };

  const handlePreset = (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB') => {
    if (preset === 'NDLS') {
      setSelectedStation(DELHI_STATIONS[0]);
    } else if (preset === 'SBB') {
      setSelectedStation(DELHI_STATIONS[6]);
    } else if (preset === 'GZB') {
      setSelectedStation(DELHI_STATIONS[7]);
    } else {
      setSelectedStation(null);
    }
  };

  return (
    <div
      className={`transition-all duration-300 select-none font-mono ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 p-4 rounded-none overflow-hidden flex flex-col'
          : 'relative w-full h-[960px] bg-slate-950 border border-control-border rounded-2xl overflow-hidden shadow-2xl'
      }`}
    >
      {/* 3D Perspective Canvas Viewport */}
      <div
        className={`w-full h-full relative transition-all duration-700 ${
          is3D ? 'scale-105' : ''
        }`}
        style={
          is3D
            ? {
                perspective: '1200px',
                transformStyle: 'preserve-3d',
              }
            : undefined
        }
      >
        <div
          className="w-full h-full relative transition-transform duration-500 origin-center"
          style={{
            transform: is3D
              ? `rotateX(28deg) rotateZ(-2deg) translateY(-20px) scale(${zoomLevel})`
              : `scale(${zoomLevel})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Spatial Grid Radar Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:36px_36px] opacity-50" />

          {/* High-Definition SVG Track Vectors (UP, DOWN, DFC Loop) */}
          <SectionLayer />

          {/* Real-time Dynamic Block Possessions Overlay (Connected to BlockStore & AI Sweep) */}
          {showBlocks && <BlockOverlay onSelectBlock={handleBlockClick} />}

          {/* Ultrasonic Defect Heatmap Layer */}
          {showHeatmap && <DefectHeatmap />}

          {/* Stations along the line */}
          {showSignals &&
            DELHI_STATIONS.map((stn) => {
              const coords = stationPercentages[stn.code] || { x: 50, y: 50 };
              return (
                <StationNode
                  key={stn.code}
                  station={stn}
                  xPercent={coords.x}
                  yPercent={coords.y}
                  isSelected={selectedStation?.code === stn.code}
                  onSelect={handleStationSelect}
                />
              );
            })}

          {/* 8 Live Animated Trains */}
          {showTrains &&
            LIVE_MAP_TRAINS.map((trn) => {
              const pos = trainPositions.find((tp) => tp.id === trn.id) || { x: 50, y: 50 };
              return (
                <TrainMarker
                  key={trn.id}
                  train={trn}
                  xPercent={pos.x}
                  yPercent={pos.y}
                  isSelected={selectedTrain?.id === trn.id}
                  onSelect={(t) => setSelectedTrain(t)}
                />
              );
            })}
        </div>
      </div>

      {/* Floating Status & AI Sync Legend (Top-Left) */}
      <div className="absolute top-4 left-4 z-40 bg-slate-950/90 backdrop-blur-md border border-control-border rounded-xl p-3 shadow-2xl space-y-2 text-xs font-mono max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-white">LIVE 3D DIGITAL TWIN</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            NDLS–GZB
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 animate-pulse border border-white" />
            <span className="text-slate-300">Active Work (Occupied)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-white" />
            <span className="text-slate-300">Sanctioned Authority</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-300 shadow-sm" />
            <span className="text-purple-300 font-bold">AI Deconflicted Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-dashed border-white animate-pulse" />
            <span className="text-amber-300 font-bold">New Proposed Request</span>
          </div>
        </div>

        {/* Quick Simulation Trigger Button */}
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition border border-purple-400/40"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ AI কনফ্লিক্ট সিমুলেশন চালান (Run Scenarios)</span>
        </button>
      </div>

      {/* Interactive Block Inspector HUD Card (Triggered by Clicking Any Block) */}
      {activeInspectorBlock && (
        <div className="absolute top-48 left-4 z-50 w-84 bg-slate-950/95 backdrop-blur-md border-2 border-cyan-500/70 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-start justify-between border-b border-control-border pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300">
                  {activeInspectorBlock.department_code}
                </span>
                <span className="text-xs font-bold text-white">
                  {activeInspectorBlock.block_code}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{activeInspectorBlock.work_type}</p>
            </div>

            <button
              onClick={() => setActiveInspectorBlock(null)}
              className="p-1 text-control-muted hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-black/50 p-2.5 rounded-xl border border-control-border/60">
            <div>
              <span className="text-[10px] text-control-muted uppercase">Kilometer Span</span>
              <p className="font-bold text-white">KM {Number(activeInspectorBlock.start_km).toFixed(1)} – {Number(activeInspectorBlock.end_km).toFixed(1)}</p>
            </div>
            <div>
              <span className="text-[10px] text-control-muted uppercase">Line Vector</span>
              <p className="font-bold text-cyan-400">{activeInspectorBlock.line_type || 'UP'} Main Track</p>
            </div>
            <div>
              <span className="text-[10px] text-control-muted uppercase">Machinery / Gang</span>
              <p className="font-bold text-slate-200 truncate">{activeInspectorBlock.equipment_required || activeInspectorBlock.gang_id || 'Gang #01'}</p>
            </div>
            <div>
              <span className="text-[10px] text-control-muted uppercase">Current Status</span>
              <p className={`font-bold ${activeInspectorBlock.status === 'SANCTIONED' ? 'text-emerald-400' : activeInspectorBlock.status === 'COORDINATED' ? 'text-purple-400' : 'text-amber-400'}`}>
                {activeInspectorBlock.status}
              </p>
            </div>
          </div>

          {/* AI Sweep Status Banner inside HUD */}
          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Sweep Status</span>
            </div>
            <p className="text-slate-300 font-sans leading-snug">
              {activeInspectorBlock.status === 'COORDINATED'
                ? 'Time-slot deconflicted & shifted to clear priority train paths. Zero collision detected.'
                : activeInspectorBlock.status === 'SANCTIONED'
                ? 'Chief Controller sanction verified. Dispatch authority active.'
                : 'Pending AI sweep evaluation. Checked against Rajdhani & Shatabdi schedules.'}
            </p>
          </div>
        </div>
      )}

      {/* Floating HUD Controls (Layers, Zoom, Fullscreen & Camera Presets) */}
      <MapControls
        is3D={is3D}
        onToggle3D={() => setIs3D(!is3D)}
        onSelectPreset={handlePreset}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Bottom Telemetry Strip */}
      <div className="absolute bottom-4 left-4 z-40 bg-slate-950/90 backdrop-blur-md border border-control-border px-4 py-2.5 rounded-xl flex items-center gap-4 text-xs font-mono shadow-2xl flex-wrap">
        <div className="flex items-center gap-2 text-cyan-400">
          <Activity className="w-4 h-4" />
          <span className="font-extrabold">MAPBOX 60 FPS WEBGL SPATIAL TWIN</span>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block" />
        <span className="text-control-muted hidden sm:inline">
          PITCH: <strong className="text-white">{is3D ? '30° 3D TILT' : '0° NADIR 2D'}</strong>
        </span>

        <div className="h-3 w-px bg-slate-800 hidden sm:block" />
        <span className="text-control-muted">
          CORRIDOR: <strong className="text-cyan-300">NDLS–GZB–CNB ({corridorLength} KM)</strong>
        </span>

        <div className="h-3 w-px bg-slate-800 hidden md:block" />
        <div className="hidden md:flex items-center gap-2 text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Live Deconfliction Active</span>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden lg:block" />
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>8 TRAINS • {blocks.length} BLOCKS LIVE (POSTGIS SRID 4326)</span>
        </div>
      </div>

      {/* Interactive AI Simulation Suite Modal */}
      <AiScenarioSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSelectScenarioToMap={(scenario) => {
          if (scenario.id === 'sc-1') handlePreset('SBB');
          else if (scenario.id === 'sc-2') handlePreset('GZB');
          else if (scenario.id === 'sc-3') handlePreset('SBB');
        }}
      />
    </div>
  );
};
