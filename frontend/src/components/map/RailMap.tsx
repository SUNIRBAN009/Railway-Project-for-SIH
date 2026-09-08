import React, { useState, useEffect, useRef } from 'react';
import { useMapStore } from '../../stores/mapStore';
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
  TrackSectionGeo,
} from '../../services/mapGeoData';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Block } from '../../types';
import { Radio, Compass, Layers, ShieldCheck, Activity } from 'lucide-react';

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

  const [is3D, setIs3D] = useState(true);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<LiveMapTrain | null>(null);

  // Animated train positions along the track
  const [trains, setTrains] = useState<LiveMapTrain[]>(LIVE_MAP_TRAINS);

  // Position coordinates mapped across canvas percentage:
  // Stations:
  // NDLS -> x: 8%, y: 50%
  // TKJ -> x: 22%, y: 52%
  // ANVT -> x: 48%, y: 57%
  // SBB -> x: 74%, y: 62%
  // GZB -> x: 92%, y: 61%
  const stationPercentages: Record<string, { x: number; y: number }> = {
    NDLS: { x: 8, y: 50 },
    TKJ: { x: 22, y: 52 },
    ANVT: { x: 48, y: 57 },
    SBB: { x: 74, y: 62 },
    GZB: { x: 92, y: 61 },
  };

  // Train animated percentages
  const [trainPositions, setTrainPositions] = useState([
    { id: 'trn-map-1', x: 62, y: 59, dx: 0.15 }, // Rajdhani moving east
    { id: 'trn-map-2', x: 14, y: 51, dx: 0.2 },  // Shatabdi moving east
    { id: 'trn-map-3', x: 88, y: 58, dx: -0.18 }, // Duronto moving west (DOWN)
    { id: 'trn-map-4', x: 74, y: 62, dx: 0 },    // Freight stationary at SBB loop
  ]);

  useEffect(() => {
    // 60 FPS simulated train marker interpolation
    const interval = setInterval(() => {
      setTrainPositions((prev) =>
        prev.map((tp) => {
          if (tp.dx === 0) return tp;
          let newX = tp.x + tp.dx;
          let newDx = tp.dx;
          if (newX > 92) {
            newX = 8;
          } else if (newX < 8) {
            newX = 92;
          }
          // calculate curved Y based on track progression
          const newY = 50 + Math.sin((newX / 100) * Math.PI) * 12;
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

  const handleTrainSelect = (train: LiveMapTrain) => {
    setSelectedTrain(train);
  };

  const handlePreset = (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB') => {
    // Preset camera refocus
    if (preset === 'NDLS') {
      setSelectedStation(DELHI_STATIONS[0]);
    } else if (preset === 'SBB') {
      setSelectedStation(DELHI_STATIONS[3]);
    } else if (preset === 'GZB') {
      setSelectedStation(DELHI_STATIONS[4]);
    } else {
      setSelectedStation(null);
    }
  };

  return (
    <div className="relative w-full h-[720px] bg-slate-950 border border-control-border rounded-2xl overflow-hidden shadow-2xl select-none font-mono">
      {/* 3D Perspective Map Canvas Container */}
      <div
        className={`w-full h-full relative transition-all duration-700 ${
          is3D ? 'scale-105' : ''
        }`}
        style={
          is3D
            ? {
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }
            : undefined
        }
      >
        <div
          className="w-full h-full relative transition-transform duration-700"
          style={
            is3D
              ? {
                  transform: 'rotateX(32deg) rotateZ(-3deg) translateY(-20px)',
                  transformStyle: 'preserve-3d',
                }
              : undefined
          }
        >
          {/* Spatial Grid Ground Planes */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

          {/* Section Track Geometry Layer */}
          <SectionLayer />

          {/* Track Possession Overlays */}
          {showBlocks && <BlockOverlay onSelectBlock={onSelectBlock} />}

          {/* Ultrasonic Defect Heatmap Layer */}
          {showHeatmap && <DefectHeatmap />}

          {/* Station Interlocking Nodes */}
          {showSignals &&
            DELHI_STATIONS.slice(0, 5).map((stn) => {
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

          {/* Real-time Animated Trains */}
          {showTrains &&
            trains.map((trn) => {
              const pos = trainPositions.find((tp) => tp.id === trn.id) || { x: 50, y: 50 };
              return (
                <TrainMarker
                  key={trn.id}
                  train={trn}
                  xPercent={pos.x}
                  yPercent={pos.y}
                  isSelected={selectedTrain?.id === trn.id}
                  onSelect={handleTrainSelect}
                />
              );
            })}
        </div>
      </div>

      {/* Floating HUD Controls */}
      <MapControls
        is3D={is3D}
        onToggle3D={() => setIs3D(!is3D)}
        onSelectPreset={handlePreset}
      />

      {/* Bottom Telemetry Strip */}
      <div className="absolute bottom-4 left-4 z-40 bg-slate-950/90 backdrop-blur-md border border-control-border px-4 py-2 rounded-xl flex items-center gap-4 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-2 text-cyan-400">
          <Activity className="w-4 h-4" />
          <span className="font-extrabold">MAPBOX 60 FPS WEBGL TWIN</span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <span className="text-control-muted">
          PITCH: <strong className="text-white">{is3D ? '45° 3D TILT' : '0° NADIR'}</strong>
        </span>
        <div className="h-3 w-px bg-slate-800" />
        <span className="text-control-muted">
          CORRIDOR: <strong className="text-cyan-300">NDLS–GZB (KM 0.0 – 25.6)</strong>
        </span>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>LIVE TRACK VECTORS ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
