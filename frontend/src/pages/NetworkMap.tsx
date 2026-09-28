import React, { useState } from 'react';
import { ControlRoomLayout } from '../layouts/ControlRoomLayout';
import { RailMap } from '../components/map/RailMap';
import { TrainTelemetryPanel } from '../components/map/TrainTelemetryPanel';
import { BlockQueueAiPanel } from '../components/map/BlockQueueAiPanel';
import { CorridorGanttStrip } from '../components/map/CorridorGanttStrip';
import { Block } from '../types';
import { useBlockStore } from '../stores/blockStore';
import { useLiveBlocks } from '../hooks/useLiveBlocks';
import { useLiveTrains } from '../hooks/useLiveTrains';
import { LIVE_MAP_TRAINS, StationData } from '../services/mapGeoData';
import { UnifiedTrain } from '../components/map/TrainMarker';
import {
  Train,
  Wrench,
  AlertTriangle,
  Cpu,
  Layers,
  Radio,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export const NetworkMapPage: React.FC = () => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<UnifiedTrain | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const storeBlocks = useBlockStore((state) => state.blocks);
  const { blocks: liveBlocks } = useLiveBlocks();
  const blocks = liveBlocks && liveBlocks.length > 0 ? liveBlocks : storeBlocks;

  const { trains: backendTrains } = useLiveTrains({ pollingIntervalMs: 4000, autoSimulate: true });
  const trains: UnifiedTrain[] = backendTrains && backendTrains.length > 0 ? backendTrains : LIVE_MAP_TRAINS;

  const activeBlocks = blocks.filter((b) => b.status === 'ACTIVE');
  const coordinatedBlocks = blocks.filter((b) => b.status === 'COORDINATED' || b.status === 'SANCTIONED');
  const pendingBlocks = blocks.filter(
    (b) => b.status === 'SUBMITTED' || b.status === 'PENDING_APPROVAL' || b.status === 'CONFLICT_DETECTED'
  );

  const totalOccupiedKm = activeBlocks
    .reduce((acc, b) => acc + Math.abs(Number(b.end_km || 0) - Number(b.start_km || 0)), 0)
    .toFixed(1);

  const onTimeCount = trains.filter(
    (t) => Number(('delay_minutes' in t ? t.delay_minutes : t.delayMinutes) || 0) <= 0
  ).length;

  const punctualityRate = trains.length > 0 ? ((onTimeCount / trains.length) * 100).toFixed(0) : '93';

  return (
    <ControlRoomLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden select-none font-mono bg-slate-950">
        {/* ------------------------------------------------------------- */}
        {/* TOP STATUS HUD BAR (Full-Width Header)                       */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-950 border-b border-control-border shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.2 rounded text-[10px] font-black bg-rose-950 border border-rose-500 text-rose-300">
                  LIVE CONTROL ROOM
                </span>
                <h2 className="text-sm font-black text-white tracking-wide uppercase">
                  Delhi–Kanpur Trunk Corridor (440.2 KM)
                </h2>
              </div>
              <p className="text-[10px] text-control-muted mt-0.5">
                NDLS (KM 0.0) → GZB (KM 24.5) → ALJN (KM 126.1) → TDL (KM 204.3) → ETW (KM 296.8) → CNB (KM 440.2)
              </p>
            </div>
          </div>

          {/* Quick Real-Time Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Trains & Punctuality */}
            <div className="px-2.5 py-1 rounded-lg border border-control-border bg-slate-900 flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-control-muted">Active Trains:</span>
              <strong className="text-white font-bold">{trains.length}</strong>
              <span className="text-emerald-400 font-bold">({punctualityRate}% Punctual)</span>
            </div>

            {/* Occupied Possessions */}
            <div className="px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-950/30 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="text-control-muted">Live Occupied:</span>
              <strong className="text-rose-300 font-bold">{activeBlocks.length} Blocks ({totalOccupiedKm} KM)</strong>
            </div>

            {/* AI Deconflicted Slots */}
            <div className="px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-control-muted">AI Deconflicted:</span>
              <strong className="text-cyan-300 font-bold">{coordinatedBlocks.length} Slots</strong>
            </div>

            {/* Sweep-Line Engine Status */}
            <div className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">SWEEP-LINE &lt; 100ms</span>
            </div>

            {/* Toggle Panel Buttons */}
            <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                  isLeftPanelOpen ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle Left Train Telemetry Panel"
              >
                Trains [20%]
              </button>
              <button
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                  isRightPanelOpen ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle Right Block Queue Panel"
              >
                Queue [20%]
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MAIN WORKSPACE: 3-PANEL CONTROL ROOM WORKSTATION              */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT PANEL: Train Telemetry (20%) */}
          {isLeftPanelOpen && (
            <div className="w-80 shrink-0 h-full border-r border-control-border transition-all duration-300">
              <TrainTelemetryPanel
                trains={trains}
                selectedTrain={selectedTrain}
                onSelectTrain={(train) => {
                  setSelectedTrain(train);
                  setSelectedStation(null);
                }}
              />
            </div>
          )}

          {/* CENTER CANVAS: Topological Schematic Map (60% to 100%) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <RailMap
              onSelectBlock={(b) => setSelectedBlock(b)}
              onSelectTrain={(t) => setSelectedTrain(t)}
              onSelectStation={(s) => setSelectedStation(s)}
              selectedTrainProp={selectedTrain}
              selectedStationProp={selectedStation}
            />
          </div>

          {/* RIGHT PANEL: Block Queue & AI Suggestions (20%) */}
          {isRightPanelOpen && (
            <div className="w-80 shrink-0 h-full border-l border-control-border transition-all duration-300">
              <BlockQueueAiPanel
                blocks={blocks}
                onSelectBlock={(b) => setSelectedBlock(b)}
              />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM TIMELINE: 24-Hour Gantt Timeline Strip (100% Width)   */}
        {/* ------------------------------------------------------------- */}
        <div className="shrink-0 z-20">
          <CorridorGanttStrip
            blocks={blocks}
            onSelectBlock={(b) => setSelectedBlock(b)}
          />
        </div>
      </div>
    </ControlRoomLayout>
  );
};
