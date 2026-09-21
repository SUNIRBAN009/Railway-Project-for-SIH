import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '../../stores/mapStore';
import {
  WB_STATIONS,
  LIVE_MAP_TRAINS,
  StationData
} from '../../services/mapGeoData';
import { Block } from '../../types';
import { useLiveTrains } from '../../hooks/useLiveTrains';
import { MapControls } from './MapControls';
import { Filter, Play, Pause, FastForward, RefreshCw, Activity, Train as TrainIcon } from 'lucide-react';
import { UnifiedTrain } from './TrainMarker';

interface RailMapProps {
  onSelectBlock?: (block: Block) => void;
}

export const RailMap: React.FC<RailMapProps> = ({ onSelectBlock }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);

  const {
    showTrains,
    showBlocks,
    showHeatmap,
    showSignals,
    selectedStationCode,
    selectStation,
  } = useMapStore();

  const [is3D, setIs3D] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);

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

  const activeTrainsList = useMemo(() => {
    return backendTrains && backendTrains.length > 0 ? backendTrains : LIVE_MAP_TRAINS;
  }, [backendTrains]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [24.0360, 87.8550], // Centered on West Bengal
      zoom: 7,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // CartoDB Dark Matter Tiles (Free, No Token Required)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Load West Bengal GeoJSON for glowing tracks
    fetch('/data/wb_rail_network.geojson')
      .then(res => res.json())
      .then(data => {
        if (!mapRef.current) return;
        
        // Add a slight glow effect with double rendering
        geojsonLayerRef.current = L.geoJSON(data, {
          style: {
            color: '#06b6d4', // Cyan
            weight: 3,
            opacity: 0.7,
            className: 'animate-pulse'
          }
        }).addTo(mapRef.current);
      })
      .catch(err => console.error("Could not load wb_rail_network.geojson", err));

    // Draw Stations
    stationsLayerRef.current = L.layerGroup().addTo(map);
    WB_STATIONS.forEach(stn => {
      const icon = L.divIcon({
        className: 'custom-station-icon',
        html: `<div class="w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
               <div class="text-white text-xs font-bold mt-1 shadow-black drop-shadow-md whitespace-nowrap">${stn.name}</div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      L.marker([stn.coordinates[1], stn.coordinates[0]], { icon }).addTo(stationsLayerRef.current!);
    });

    setMapLoaded(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Train Animation Logic using Leaflet Markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !showTrains) return;

    const map = mapRef.current;

    activeTrainsList.forEach(trn => {
      const id = ('train_number' in trn ? trn.train_number : trn.id) || 'TRN';
      let marker = markersRef.current[id];

      const coords = trn.coordinates || [88.3411, 22.5833]; // Fallback to HWH if backend lacks coords

      if (!marker) {
        const trainIcon = L.divIcon({
          className: 'custom-train-icon',
          html: `<div class="w-5 h-5 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_15px_rgba(34,211,238,1)] flex items-center justify-center">
                   <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
                 </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        marker = L.marker([coords[1], coords[0]], { icon: trainIcon }).addTo(map);
        markersRef.current[id] = marker;
      }

      marker.setLatLng([coords[1], coords[0]]);
    });

    // Cleanup removed trains
    Object.keys(markersRef.current).forEach(id => {
      const exists = activeTrainsList.find(t => ('train_number' in t ? t.train_number : t.id) === id);
      if (!exists) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

  }, [activeTrainsList, mapLoaded, showTrains]);

  const handlePreset = (preset: 'FULL' | 'NDLS' | 'SBB' | 'GZB' | 'HWH' | 'NJP') => {
    if (!mapRef.current) return;
    if (preset === 'HWH') {
      mapRef.current.setView([22.5833, 88.3411], 12);
    } else if (preset === 'NJP') {
      mapRef.current.setView([26.6806, 88.4372], 12);
    } else {
      mapRef.current.setView([24.0360, 87.8550], 7);
    }
  };

  const onTimeCount = activeTrainsList.filter((t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) <= 0).length;
  const delayedCount = activeTrainsList.filter((t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) > 0).length;

  return (
    <div className="relative w-full h-[760px] bg-slate-950 border border-control-border rounded-2xl overflow-hidden shadow-2xl select-none font-mono">
      {/* Top Telemetry & Simulation Action Bar */}
      <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-xl border border-control-border px-4 py-2.5 rounded-xl shadow-2xl">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-control-muted flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Line:</span>
          </span>
          <button onClick={() => setDirectionFilter('ALL')} className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${directionFilter === 'ALL' ? 'bg-cyan-500 text-black shadow-cyan-500/30 shadow-md' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>ALL ({activeTrainsList.length})</button>
          <button onClick={() => setDirectionFilter('DOWN')} className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${directionFilter === 'DOWN' ? 'bg-cyan-500 text-black shadow-cyan-500/30 shadow-md' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>DOWN Line (NJP &rarr; HWH)</button>
          <button onClick={() => setDirectionFilter('UP')} className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition-all ${directionFilter === 'UP' ? 'bg-purple-500 text-white shadow-purple-500/30 shadow-md' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>UP Line (HWH &rarr; NJP)</button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsAutoSimulating(!isAutoSimulating)} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${isAutoSimulating ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-emerald-900/50 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
            {isAutoSimulating ? <><Pause className="w-3.5 h-3.5 text-emerald-400" /><span>Auto-Move ON</span><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /></> : <><Play className="w-3.5 h-3.5" /><span>Auto-Move OFF</span></>}
          </button>
          <button disabled={isTicking} onClick={() => advanceSimulation(30)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/40 text-cyan-300 transition-all disabled:opacity-50">
            <FastForward className={`w-3.5 h-3.5 ${isTicking ? 'animate-spin' : ''}`} /><span>Step +30s</span>
          </button>
          <button onClick={() => refreshTrains()} className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">
            <RefreshCw className={`w-3.5 h-3.5 ${isTrainsLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leaflet Container - Needs explicit position/z-index for the dark theme to overlay correctly */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ backgroundColor: '#0f172a' }} />

      {/* Floating HUD Controls */}
      <MapControls is3D={is3D} onToggle3D={() => setIs3D(!is3D)} onSelectPreset={handlePreset as any} />

      {/* Bottom Telemetry Strip */}
      <div className="absolute bottom-4 left-4 right-4 z-40 bg-slate-950/90 backdrop-blur-md border border-control-border px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="font-extrabold tracking-wide">LEAFLET GIS ENGINE</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-control-muted">THEME: <strong className="text-white">CARTODB DARK MATTER</strong></span>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-control-muted">CORRIDOR: <strong className="text-cyan-300">WEST BENGAL NETWORK</strong></span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1 text-slate-300">
            <TrainIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active:</span><strong className="text-white font-bold">{activeTrainsList.length}</strong>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>On-Time:</span><strong className="font-bold">{onTimeCount}</strong>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Delayed:</span><strong className="font-bold">{delayedCount}</strong>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>OSM GEOJSON LIVE</span>
          </div>
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
