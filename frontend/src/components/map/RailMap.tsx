import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { SectionLayer } from './SectionLayer';
import { StationNode } from './StationNode';
import { TrainMarker, UnifiedTrain } from './TrainMarker';
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
import { Block } from '../../types';
import { useLiveTrains } from '../../hooks/useLiveTrains';
import { useLiveBlocks } from '../../hooks/useLiveBlocks';
import { LiveTrainRecord } from '../../services/api';
import {
  Radio,
  Compass,
  Layers,
  ShieldCheck,
  Activity,
  Play,
  Pause,
  FastForward,
  Filter,
  Train as TrainIcon,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface RailMapProps {
  onSelectBlock?: (block: Block) => void;
}

interface RenderedTrainPosition {
  x: number;
  y: number;
  heading: number;
  currentKm: number;
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
  const [selectedTrain, setSelectedTrain] = useState<UnifiedTrain | null>(null);
  const [corridorLength, setCorridorLength] = useState<number>(440.2);
  const { blocks: liveBlocks } = useLiveBlocks();

  // Live trains from backend REST API
  const {
    trains: backendTrains,
    isLoading: isTrainsLoading,
    directionFilter,
    setDirectionFilter,
    statusFilter,
    setStatusFilter,
    isAutoSimulating,
    setIsAutoSimulating,
    isTicking,
    advanceSimulation,
    refresh: refreshTrains,
  } = useLiveTrains({ pollingIntervalMs: 4000, autoSimulate: true });

  // Merge backend trains with fallback mock trains if backend is empty
  const activeTrainsList: UnifiedTrain[] = useMemo(() => {
    if (backendTrains && backendTrains.length > 0) {
      return backendTrains;
    }
    return LIVE_MAP_TRAINS;
  }, [backendTrains]);

  // Corridor Station Coordinates along the NDLS - CNB Trunk (0.0 to 440.2 KM)
  const stationPercentages: Record<string, { x: number; y: number }> = {
    NDLS: { x: 6, y: 48 },
    GZB:  { x: 14, y: 53 },
    ALJN: { x: 34, y: 62 },
    TDL:  { x: 50, y: 64 },
    ETW:  { x: 68, y: 61 },
    CNB:  { x: 94, y: 50 },
    TKJ:  { x: 8, y: 49 },
    ANVT: { x: 11, y: 51 },
    SBB:  { x: 13, y: 52 },
  };

  // Helper: map a kilometer value (0 to 440.2) and direction to (x%, y%, heading°)
  const calculateTrackSplinePoint = (kmVal: number, direction: string): { x: number; y: number; heading: number } => {
    const totalKm = 440.2;
    const clampedKm = Math.max(0.0, Math.min(totalKm, kmVal));
    const p = clampedKm / totalKm; // 0.0 to 1.0

    // Canvas X spans from 6% (NDLS) to 94% (CNB)
    const x = 6 + p * 88;

    // Canvas Y follows a gentle natural curve along the trunk
    const yBase = 50 + Math.sin(p * Math.PI) * 14;

    // Parallel track offset: DOWN line +1.8%, UP line -1.8%
    const isDown = direction.toUpperCase() === 'DOWN';
    const y = yBase + (isDown ? 1.8 : -1.8);

    // Tangent angle along spline dy/dx
    const dy = Math.PI * 14 * Math.cos(p * Math.PI);
    const dx = 88;
    const tangentDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Heading: DOWN trains face ~90° + tangent (heading East), UP face ~270° - tangent (heading West)
    const heading = isDown ? 90 + tangentDeg : 270 - tangentDeg;

    return { x, y, heading: (heading + 360) % 360 };
  };

  // 60 FPS requestAnimationFrame positions state
  const [renderedPositions, setRenderedPositions] = useState<Record<string, RenderedTrainPosition>>({});
  const trainStateRef = useRef<Record<string, { currentKm: number; targetKm: number; speedKmh: number; direction: string }>>({});
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Synchronize target positions from telemetry updates
  useEffect(() => {
    activeTrainsList.forEach((t) => {
      const id = ('train_number' in t ? t.train_number : t.id) || 'TRN';
      const km = Number(('current_km' in t ? t.current_km : 50) || 0);
      const speed = Number(('speed_kmh' in t ? t.speed_kmh : t.speedKmh) || 0);
      const dir = (('direction' in t ? t.direction : t.lineType) || 'DOWN').toUpperCase();

      if (!trainStateRef.current[id]) {
        trainStateRef.current[id] = {
          currentKm: km,
          targetKm: km,
          speedKmh: speed,
          direction: dir,
        };
      } else {
        trainStateRef.current[id].targetKm = km;
        trainStateRef.current[id].speedKmh = speed;
        trainStateRef.current[id].direction = dir;
      }
    });
  }, [activeTrainsList]);

  // 60 FPS requestAnimationFrame animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1); // seconds
      lastTimeRef.current = currentTime;

      const newPositions: Record<string, RenderedTrainPosition> = {};

      Object.entries(trainStateRef.current).forEach(([id, state]) => {
        // Continuous smooth interpolation towards targetKm, or continuous movement
        const diff = state.targetKm - state.currentKm;
        const absDiff = Math.abs(diff);

        if (absDiff > 0.05) {
          // Smooth convergence to fresh telemetry update
          state.currentKm += diff * Math.min(1.0, dt * 3.5);
        } else if (state.speedKmh > 0) {
          // Smooth forward motion between telemetry updates
          const deltaKm = (state.speedKmh * dt) / 3600;
          if (state.direction === 'DOWN') {
            state.currentKm += deltaKm;
            if (state.currentKm > 440.2) state.currentKm = 0;
          } else {
            state.currentKm -= deltaKm;
            if (state.currentKm < 0) state.currentKm = 440.2;
          }
          state.targetKm = state.currentKm;
        }

        const pt = calculateTrackSplinePoint(state.currentKm, state.direction);
        newPositions[id] = {
          x: pt.x,
          y: pt.y,
          heading: pt.heading,
          currentKm: state.currentKm,
        };
      });

      setRenderedPositions(newPositions);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Fetch live PostGIS SRID 4326 GeoJSON corridor length
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

  const handleStationSelect = (station: StationData) => {
    setSelectedStation(station);
    selectStation(station.code);
  };

  const handleTrainSelect = (train: UnifiedTrain) => {
    setSelectedTrain(train);
  };

  const handlePreset = (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB') => {
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

  // Punctuality counters for HUD
  const onTimeCount = activeTrainsList.filter(
    (t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) <= 0
  ).length;
  const delayedCount = activeTrainsList.filter(
    (t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) > 0
  ).length;

  return (
    <div className="relative w-full h-[760px] bg-slate-950 border border-control-border rounded-2xl overflow-hidden shadow-2xl select-none font-mono">
      {/* Top Telemetry & Simulation Action Bar */}
      <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-xl border border-control-border px-4 py-2.5 rounded-xl shadow-2xl">
        {/* Direction Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-control-muted flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Line:</span>
          </span>

          <button
            type="button"
            onClick={() => setDirectionFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              directionFilter === 'ALL'
                ? 'bg-cyan-500 text-black shadow-cyan-500/30 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            ALL ({activeTrainsList.length})
          </button>

          <button
            type="button"
            onClick={() => setDirectionFilter('DOWN')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              directionFilter === 'DOWN'
                ? 'bg-cyan-500 text-black shadow-cyan-500/30 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            DOWN Line (NDLS &rarr; CNB)
          </button>

          <button
            type="button"
            onClick={() => setDirectionFilter('UP')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              directionFilter === 'UP'
                ? 'bg-purple-500 text-white shadow-purple-500/30 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            UP Line (CNB &rarr; NDLS)
          </button>
        </div>

        {/* Real-Time Telemetry Simulation Controls */}
        <div className="flex items-center gap-2">
          {/* Auto-Simulation Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              isAutoSimulating
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-emerald-900/50 shadow-md'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Automatically advances trains along track every 4 seconds"
          >
            {isAutoSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Move ON</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Auto-Move OFF</span>
              </>
            )}
          </button>

          {/* Manual Telemetry Simulation Step */}
          <button
            type="button"
            disabled={isTicking}
            onClick={() => advanceSimulation(30)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 transition-all disabled:opacity-50"
            title="Advances train telemetry step by 30 seconds"
          >
            <FastForward className={`w-3.5 h-3.5 ${isTicking ? 'animate-spin' : ''}`} />
            <span>Step +30s</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => refreshTrains()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Refresh live telemetry from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTrainsLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

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
                  transform: 'rotateX(45deg) rotateZ(-3deg) translateY(-20px)',
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
          {showBlocks && <BlockOverlay blocks={liveBlocks} onSelectBlock={onSelectBlock} />}

          {/* Ultrasonic Defect Heatmap Layer */}
          {showHeatmap && <DefectHeatmap />}

          {/* Station Interlocking Nodes */}
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

          {/* 60 FPS Animated Train Markers on Mapbox Canvas */}
          {showTrains &&
            activeTrainsList.map((trn) => {
              const id = ('train_number' in trn ? trn.train_number : trn.id) || 'TRN';
              const pos = renderedPositions[id] || {
                x: 50,
                y: 50,
                heading: Number(('heading' in trn ? trn.heading : 122) || 122),
                currentKm: Number(('current_km' in trn ? trn.current_km : 0) || 0),
              };

              const enrichedTrain: UnifiedTrain = {
                ...trn,
                displayHeading: pos.heading,
              };

              return (
                <TrainMarker
                  key={id}
                  train={enrichedTrain}
                  xPercent={pos.x}
                  yPercent={pos.y}
                  isSelected={
                    selectedTrain
                      ? ('train_number' in selectedTrain ? selectedTrain.train_number : selectedTrain.id) === id
                      : false
                  }
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
      <div className="absolute bottom-4 left-4 right-4 z-40 bg-slate-950/90 backdrop-blur-md border border-control-border px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="font-extrabold tracking-wide">60 FPS RAF ENGINE</span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <span className="text-control-muted">
            PITCH: <strong className="text-white">{is3D ? '45° 3D ISOMETRIC' : '0° NADIR'}</strong>
          </span>

          <div className="h-3 w-px bg-slate-800" />

          <span className="text-control-muted">
            CORRIDOR: <strong className="text-cyan-300">NDLS–CNB TRUNK ({corridorLength} KM)</strong>
          </span>
        </div>

        {/* Live Train Telemetry Counts */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1 text-slate-300">
            <TrainIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active:</span>
            <strong className="text-white font-bold">{activeTrainsList.length}</strong>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>On-Time:</span>
            <strong className="font-bold">{onTimeCount}</strong>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Delayed:</span>
            <strong className="font-bold">{delayedCount}</strong>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>POSTGIS SRID 4326 LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

