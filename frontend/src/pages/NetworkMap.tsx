import React, { useState } from 'react';
import { ControlRoomLayout } from '../layouts/ControlRoomLayout';
import { RailMap } from '../components/map/RailMap';
import { Block } from '../types';
import { useBlockStore } from '../stores/blockStore';
import { useLiveBlocks } from '../hooks/useLiveBlocks';
import { LIVE_MAP_TRAINS } from '../services/mapGeoData';
import {
  MapPin,
  Train,
  Wrench,
  AlertTriangle,
  Compass,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

export const NetworkMapPage: React.FC = () => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const storeBlocks = useBlockStore((state) => state.blocks);
  const { blocks: liveBlocks } = useLiveBlocks();
  const blocks = liveBlocks && liveBlocks.length > 0 ? liveBlocks : storeBlocks;

  const activeBlocks = blocks.filter((b) => b.status === 'ACTIVE');
  const coordinatedBlocks = blocks.filter((b) => b.status === 'COORDINATED' || b.status === 'SANCTIONED');
  const pendingBlocks = blocks.filter(
    (b) => b.status === 'SUBMITTED' || b.status === 'PENDING_APPROVAL' || b.status === 'CONFLICT_DETECTED'
  );

  // Total possessed km
  const totalOccupiedKm = activeBlocks
    .reduce((acc, b) => acc + Math.abs(b.end_km - b.start_km), 0)
    .toFixed(1);

  const handleSelectBlock = (block: Block) => {
    setSelectedBlock(block);
  };

  return (
    <ControlRoomLayout>
      <div className="p-6 space-y-5">
        {/* Header Strip */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-control-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <h2 className="text-xl font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
                Delhi – Ghaziabad Corridor • 3D GIS Digital Twin
                <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full font-sans">
                  REAL-TIME SYNC
                </span>
              </h2>
            </div>
            <p className="text-xs text-control-muted mt-1 font-mono">
              NDLS (KM 0.0) → MIU (KM 32.0) • 9 Quad-Track Stations • 8 Live Telemetry Rakes • Sweep-Line AI Engine Active
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-xl border border-control-border bg-control-panel flex items-center gap-2 shadow-sm">
              <Train className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-control-muted">Active Rakes:</span>
              <strong className="text-white">{LIVE_MAP_TRAINS.length} Trains</strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-950/20 flex items-center gap-2 shadow-sm">
              <Wrench className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="text-control-muted">Live Occupied:</span>
              <strong className="text-rose-300">{activeBlocks.length} Blocks ({totalOccupiedKm} KM)</strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-950/20 flex items-center gap-2 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-control-muted">AI Deconflicted:</span>
              <strong className="text-purple-300">{coordinatedBlocks.length} Slots</strong>
            </div>

            {pendingBlocks.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-300 flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Pending Approvals: {pendingBlocks.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3D GIS Radar Canvas */}
        <RailMap onSelectBlock={handleSelectBlock} />
      </div>
    </ControlRoomLayout>
  );
};
