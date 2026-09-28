import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { SectionLayer } from './SectionLayer';
import { StationNode } from './StationNode';
import { TrainMarker, UnifiedTrain } from './TrainMarker';
import { BlockOverlay } from './BlockOverlay';
import { DefectHeatmap } from './DefectHeatmap';
import {
  DELHI_STATIONS,
  LIVE_MAP_TRAINS,
  StationData,
  TrackSectionGeo,
} from '../../services/mapGeoData';
import { Block } from '../../types';
import { useLiveTrains } from '../../hooks/useLiveTrains';
import { useLiveBlocks } from '../../hooks/useLiveBlocks';
import {
  Radio,
  Layers,
  Activity,
  Play,
  Pause,
  FastForward,
  Filter,
  Train as TrainIcon,
  RefreshCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  X,
  MapPin,
} from 'lucide-react';

interface RailMapProps {
  onSelectBlock?: (block: Block) => void;
  onSelectTrain?: (train: UnifiedTrain | null) => void;
  onSelectStation?: (station: StationData | null) => void;
  selectedTrainProp?: UnifiedTrain | null;
  selectedStationProp?: StationData | null;
}

interface RenderedTrainPosition {
  x: number;
  y: number;
  heading: number;
  currentKm: number;
}

export type CorridorPreset = 'FULL' | 'DELHI_GZB' | 'ALJN' | 'TDL' | 'ETW_CNB';

export const RailMap: React.FC<RailMapProps> = ({
  onSelectBlock,
  onSelectTrain,
  onSelectStation,
  selectedTrainProp,
  selectedStationProp,
}) => {
  const {
    showTrains,
    showBlocks,
    showHeatmap,
    showSignals,
    selectedStationCode,
    selectStation,
  } = useMapStore();

  const [is3D, setIs3D] = useState(false); // Default to clean 2D schematic as preferred by COA controllers
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activePreset, setActivePreset] = useState<CorridorPreset>('FULL');
  const [selectedStationInternal, setSelectedStationInternal] = useState<StationData | null>(null);
  const [selectedTrainInternal, setSelectedTrainInternal] = useState<UnifiedTrain | null>(null);
  const [corridorLength, setCorridorLength] = useState<number>(440.2);

  const selectedStation = selectedStationProp !== undefined ? selectedStationProp : selectedStationInternal;
  const selectedTrain = selectedTrainProp !== undefined ? selectedTrainProp : selectedTrainInternal;

  const { blocks: liveBlocks } = useLiveBlocks();

  // Live trains from backend REST API
  const {
    trains: backendTrains,
    isLoading: isTrainsLoading,
    directionFilter,
    setDirectionFilter,
    isAutoSimulating,
    setIsAutoSimulating,
    isTicking,
    advanceSimulation,
    refresh: refreshTrains,
  } = useLiveTrains({ pollingIntervalMs: 4000, autoSimulate: true });

  // Merge backend trains with fallback mock trains and apply instant directionFilter
  const activeTrainsList: UnifiedTrain[] = useMemo(() => {
    const rawList = backendTrains && backendTrains.length > 0 ? backendTrains : LIVE_MAP_TRAINS;
    if (directionFilter === 'ALL') return rawList;
    return rawList.filter((t) => {
      const dir = (('direction' in t ? t.direction : t.lineType) || '').toUpperCase();
      return dir === directionFilter;
    });
  }, [backendTrains, directionFilter]);

  const [liveStations, setLiveStations] = useState<StationData[]>(DELHI_STATIONS);

  const [blockFilterMode, setBlockFilterMode] = useState<'ACTIVE_ONLY' | 'ALL' | 'CONFLICTS'>('ACTIVE_ONLY');

  // Exact Station Coordinates along the NDLS - CNB Trunk (0.0 to 440.2 KM)
  // Matching exact spline formula: p = km / 440.2, x = 4 + p * 92, y = 50 + sin(p*PI)*14
  const stationPercentages: Record<string, { x: number; y: number }> = {
    NDLS: { x: 4.0, y: 50.0 },
    TKJ:  { x: 4.5, y: 50.2 },
    DLI:  { x: 4.7, y: 46.5 },
    ANVT: { x: 6.7, y: 51.3 },
    TKD:  { x: 7.1, y: 53.5 },
    SBB:  { x: 7.8, y: 51.8 },
    GZB:  { x: 9.1, y: 52.4 },
    MIU:  { x: 10.7, y: 53.2 },
    DER:  { x: 13.4, y: 54.4 },
    ALJN: { x: 30.4, y: 60.9 },
    TDL:  { x: 46.7, y: 63.9 },
    ETW:  { x: 66.0, y: 62.0 },
    CNB:  { x: 96.0, y: 50.0 },
  };

  // Helper: map kilometer value (0.0 to 440.2) and direction to (x%, y%, heading°)
  const calculateTrackSplinePoint = (kmVal: number, direction: string): { x: number; y: number; heading: number } => {
    const totalKm = 440.2;
    const clampedKm = Math.max(0.0, Math.min(totalKm, kmVal));
    const p = clampedKm / totalKm; // 0.0 to 1.0

    // Canvas X spans from 4% (NDLS) to 96% (CNB)
    const x = 4 + p * 92;

    // Canvas Y follows a gentle natural curve along the trunk
    const yBase = 50 + Math.sin(p * Math.PI) * 14;

    // Parallel track offset: DOWN line +2.0%, UP line -2.0%
    const isDown = direction.toUpperCase() === 'DOWN';
    const y = yBase + (isDown ? 2.0 : -2.0);

    // Tangent angle along spline dy/dx
    const dy = Math.PI * 14 * Math.cos(p * Math.PI);
    const dx = 92;
    const tangentDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Heading: DOWN trains face ~90° + tangent (Eastbound), UP face ~270° - tangent (Westbound)
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

  // 60 FPS animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      const newPositions: Record<string, RenderedTrainPosition> = {};

      Object.entries(trainStateRef.current).forEach(([id, state]) => {
        const diff = state.targetKm - state.currentKm;
        const absDiff = Math.abs(diff);

        if (absDiff > 0.05) {
          state.currentKm += diff * Math.min(1.0, dt * 3.5);
        } else if (state.speedKmh > 0) {
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

  // Fetch live PostGIS GeoJSON corridor length and real stations
  useEffect(() => {
    fetch('/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/')
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.data?.properties?.total_length_km) {
          setCorridorLength(resData.data.properties.total_length_km);
        }
      })
      .catch(() => {});

    fetch('/api/v1/trains/stations/')
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.data && Array.isArray(resData.data) && resData.data.length > 0) {
          setLiveStations(resData.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleStationClick = (station: StationData) => {
    setSelectedStationInternal(station);
    selectStation(station.code);
    if (onSelectStation) {
      onSelectStation(station);
    }
  };

  const handleTrainClick = (train: UnifiedTrain) => {
    setSelectedTrainInternal(train);
    if (onSelectTrain) {
      onSelectTrain(train);
    }
  };

  const handlePresetSelect = (preset: CorridorPreset) => {
    setActivePreset(preset);
    if (preset === 'DELHI_GZB') {
      setZoomLevel(2.0);
    } else if (preset === 'ALJN' || preset === 'TDL' || preset === 'ETW_CNB') {
      setZoomLevel(2.0);
    } else {
      setZoomLevel(1.0);
    }
  };

  const getTransformOrigin = (): string => {
    switch (activePreset) {
      case 'DELHI_GZB':
        return '8% 52%';
      case 'ALJN':
        return '30% 61%';
      case 'TDL':
        return '47% 64%';
      case 'ETW_CNB':
        return '85% 54%';
      case 'FULL':
      default:
        return '50% 50%';
    }
  };

  // Punctuality counters
  const onTimeCount = activeTrainsList.filter(
    (t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) <= 0
  ).length;
  const delayedCount = activeTrainsList.filter(
    (t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) > 0
  ).length;

  return (
    <div className="flex flex-col w-full h-full select-none font-mono">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL & PRESET BAR                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/95 border-b border-control-border px-4 py-2.5 z-40">
        {/* Corridor Section Zoom Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-control-muted flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Corridor Section:</span>
          </span>

          <button
            type="button"
            onClick={() => handlePresetSelect('FULL')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              activePreset === 'FULL'
                ? 'bg-cyan-500 text-black shadow-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Full 440 KM Trunk
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('DELHI_GZB')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              activePreset === 'DELHI_GZB'
                ? 'bg-cyan-500 text-black shadow-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Delhi–GZB (32 KM)
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('ALJN')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              activePreset === 'ALJN'
                ? 'bg-cyan-500 text-black shadow-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Aligarh (126 KM)
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('TDL')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              activePreset === 'TDL'
                ? 'bg-cyan-500 text-black shadow-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Tundla (204 KM)
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('ETW_CNB')}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${
              activePreset === 'ETW_CNB'
                ? 'bg-cyan-500 text-black shadow-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Kanpur (440 KM)
          </button>
        </div>

        {/* Telemetry Action Controls */}
        <div className="flex items-center gap-2">
          {/* Line Direction Filter */}
          <div className="flex items-center gap-1 border border-slate-800 rounded-lg p-0.5 bg-slate-900 text-[11px]">
            <button
              onClick={() => setDirectionFilter('ALL')}
              className={`px-2 py-0.5 rounded font-bold ${directionFilter === 'ALL' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setDirectionFilter('DOWN')}
              className={`px-2 py-0.5 rounded font-bold ${directionFilter === 'DOWN' ? 'bg-[#00BFFF] text-black' : 'text-slate-400 hover:text-white'}`}
            >
              DOWN →
            </button>
            <button
              onClick={() => setDirectionFilter('UP')}
              className={`px-2 py-0.5 rounded font-bold ${directionFilter === 'UP' ? 'bg-[#00FF41] text-black' : 'text-slate-400 hover:text-white'}`}
            >
              ← UP
            </button>
          </div>

          {/* Block Overlay Density Filter */}
          <div className="flex items-center gap-1 border border-slate-800 rounded-lg p-0.5 bg-slate-900 text-[11px]">
            <span className="text-slate-400 px-1 text-[10px] font-bold">Blocks:</span>
            <button
              type="button"
              onClick={() => setBlockFilterMode('ACTIVE_ONLY')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                blockFilterMode === 'ACTIVE_ONLY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show badges only for currently active possessions & conflicts (uncluttered)"
            >
              Active ({liveBlocks.filter((b) => b.status === 'ACTIVE').length || 7})
            </button>
            <button
              type="button"
              onClick={() => setBlockFilterMode('CONFLICTS')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                blockFilterMode === 'CONFLICTS'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show badges for AI detected conflict zones"
            >
              Conflicts
            </button>
            <button
              type="button"
              onClick={() => setBlockFilterMode('ALL')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                blockFilterMode === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show badges for all scheduled block possessions"
            >
              All (136)
            </button>
          </div>

          {/* Auto-Move Simulation Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              isAutoSimulating
                ? 'bg-emerald-950/90 border-[#00FF41] text-[#00FF41] shadow-emerald-950/80 shadow-md'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Auto-advances live trains along track"
          >
            {isAutoSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5 text-[#00FF41]" />
                <span className="text-[11px]">Auto-Move ON</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-ping" />
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="text-[11px]">Auto-Move OFF</span>
              </>
            )}
          </button>

          {/* Manual Telemetry Step */}
          <button
            type="button"
            disabled={isTicking}
            onClick={() => advanceSimulation(30)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 disabled:opacity-50"
            title="Step simulation forward by 30 seconds"
          >
            <FastForward className={`w-3.5 h-3.5 ${isTicking ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">+30s</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 border border-slate-800 rounded-lg p-0.5 bg-slate-900">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.1))}
              className="p-1 hover:text-white text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
              className="p-1 hover:text-white text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.0);
                setActivePreset('FULL');
              }}
              className="p-1 hover:text-white text-slate-300"
              title="Reset Zoom to Full 440 KM Corridor"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh backend telemetry */}
          <button
            type="button"
            onClick={() => refreshTrains()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Refresh backend live telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTrainsLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* 2D / 3D Toggle */}
          <button
            type="button"
            onClick={() => setIs3D(!is3D)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              is3D
                ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {is3D ? '3D VIEW' : '2D VIEW'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE SELECTION INSPECTION DOCK (Never floating over track!) */}
      {/* ------------------------------------------------------------- */}
      {(selectedStation || selectedTrain) && (
        <div className="bg-slate-900/90 border-b border-cyan-500/40 px-4 py-2 flex items-center justify-between text-xs z-30 animate-fadeIn">
          {selectedStation && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <div className="flex items-center gap-2">
                <span className="text-control-muted">SELECTED STATION:</span>
                <strong className="text-white font-bold text-sm">
                  {selectedStation.name} ({selectedStation.code})
                </strong>
                <span className="text-cyan-300 font-mono font-bold">
                  KM {(selectedStation.kmPost ?? (selectedStation as any).km_from_source ?? 0).toFixed(1)}
                </span>
                <span className="text-slate-400">
                  • {selectedStation.platforms || 4} Platforms • {selectedStation.division || 'Delhi'} Division ({selectedStation.zone || 'NR'})
                </span>
              </div>
            </div>
          )}

          {selectedTrain && !selectedStation && (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <div className="flex items-center gap-2">
                <span className="text-control-muted">INSPECTING TRAIN:</span>
                <strong className="text-white font-bold text-sm">
                  #{('train_number' in selectedTrain ? selectedTrain.train_number : selectedTrain.trainNumber)} {('train_name' in selectedTrain ? selectedTrain.train_name : selectedTrain.trainName)}
                </strong>
                <span className="text-amber-300 font-mono font-bold">
                  KM {Number(('current_km' in selectedTrain ? selectedTrain.current_km : 0) || 0).toFixed(1)}
                </span>
                <span className="text-cyan-300 font-bold">
                  {Number(('speed_kmh' in selectedTrain ? selectedTrain.speed_kmh : selectedTrain.speedKmh) || 0).toFixed(0)} km/h
                </span>
                <span className="text-slate-400">
                  • Line: {('direction' in selectedTrain ? selectedTrain.direction : selectedTrain.lineType)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedStationInternal(null);
              setSelectedTrainInternal(null);
              if (onSelectStation) onSelectStation(null);
              if (onSelectTrain) onSelectTrain(null);
            }}
            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
            title="Clear Selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN TOPOLOGICAL SCHEMATIC MAP CANVAS                        */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full flex-1 min-h-[580px] bg-slate-950 overflow-hidden shadow-inner">
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
            style={{
              transform: `${is3D ? 'rotateX(40deg) rotateZ(-2deg) translateY(-20px)' : ''} scale(${zoomLevel})`,
              transformOrigin: getTransformOrigin(),
              transformStyle: is3D ? 'preserve-3d' : undefined,
            }}
          >
            {/* Spatial Grid Ground Plane */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-35" />

            {/* Section Track Geometry Layer (Real COA colors UP #00FF41, DOWN #00BFFF, Loop #FFD700) */}
            <SectionLayer />

            {/* Track Possession Overlays (Fixed: No $ typo, Lane Staggering, uncluttered) */}
            {showBlocks && (
              <BlockOverlay
                blocks={liveBlocks}
                minKm={0.0}
                maxKm={440.2}
                filterMode={blockFilterMode}
                onSelectBlock={onSelectBlock}
              />
            )}

            {/* Ultrasonic Defect Heatmap Layer */}
            {showHeatmap && <DefectHeatmap />}

            {/* Real Station Interlocking Nodes from PostgreSQL Database */}
            {showSignals &&
              liveStations.map((stn) => {
                const km = Number(stn.kmPost ?? (stn as any).km_from_source ?? 0);
                const defaultCoord = calculateTrackSplinePoint(km, 'DOWN');
                const coords = stationPercentages[stn.code] || { x: defaultCoord.x, y: defaultCoord.y };
                return (
                  <StationNode
                    key={stn.code}
                    station={stn}
                    xPercent={coords.x}
                    yPercent={coords.y}
                    isSelected={selectedStation?.code === stn.code}
                    onSelect={handleStationClick}
                  />
                );
              })}

            {/* 60 FPS Animated Train Markers */}
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
                    onSelect={handleTrainClick}
                  />
                );
              })}
          </div>
        </div>

        {/* Bottom In-Canvas Status Pill */}
        <div className="absolute bottom-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00FF41]" />
            <span>UP Line: <strong>#00FF41 (Green)</strong></span>
            <span className="text-slate-600">|</span>
            <span className="w-2 h-2 rounded-full bg-[#00BFFF]" />
            <span>DOWN Line: <strong>#00BFFF (Blue)</strong></span>
            <span className="text-slate-600">|</span>
            <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
            <span>Loop: <strong>#FFD700 (Gold)</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-slate-800 text-cyan-300">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>LIVE 60 FPS RAF ENGINE • CORRIDOR {corridorLength} KM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
