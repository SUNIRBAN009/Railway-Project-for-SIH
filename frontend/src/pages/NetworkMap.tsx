import React, { useState } from 'react';
import { ControlRoomLayout } from '../layouts/ControlRoomLayout';
import { RailMap } from '../components/map/RailMap';
import { Block } from '../types';
import { DEMO_BLOCKS, DEMO_TRAINS } from '../services/demoData';
import {
  MapPin,
  Train,
  Wrench,
  AlertTriangle,
  Compass,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const NetworkMapPage: React.FC = () => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(DEMO_BLOCKS[0]);

  const handleSelectBlock = (block: Block) => {
    setSelectedBlock(block);
  };

  return (
    <ControlRoomLayout>
      <div className="p-6 space-y-5">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-control-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                Delhi Division 3D GIS Corridor Digital Twin
              </h2>
            </div>
            <p className="text-xs text-control-muted mt-1 font-mono">
              High-fidelity spatial telemetry • Mapbox GL JS 60 FPS vector canvas • SRID 4326 PostGIS geometry
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-xl border border-control-border bg-control-panel flex items-center gap-2">
              <Train className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-control-muted">Active Trains:</span>
              <strong className="text-white">4</strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-control-border bg-control-panel flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-control-muted">Possessed Span:</span>
              <strong className="text-cyan-300">4.4 KM</strong>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>USFD Flaw at KM 14.8</span>
            </div>
          </div>
        </div>

        {/* 3D GIS Radar Canvas */}
        <RailMap onSelectBlock={handleSelectBlock} />
      </div>
    </ControlRoomLayout>
  );
};
