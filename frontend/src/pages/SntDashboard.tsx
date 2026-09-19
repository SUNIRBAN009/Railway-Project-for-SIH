import React, { useState } from 'react';
import { DepartmentLayout } from '../layouts/DepartmentLayout';
import { BlockList } from '../components/blocks/BlockList';
import { BlockRequestForm } from '../components/blocks/BlockRequestForm';
import { BlockTimeline } from '../components/blocks/BlockTimeline';
import { CrewAssignment } from '../components/departments/CrewAssignment';
import { MaterialInventory } from '../components/departments/MaterialInventory';
import { CalendarView } from '../components/blocks/CalendarView';
import { DEMO_BLOCKS } from '../services/demoData';
import { Block } from '../types';
import {
  Radio,
  Plus,
  Zap,
  Clock,
  Layers,
  Calendar,
  Users,
  Package,
  Activity,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SntDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BLOCKS' | 'PROPOSE' | 'TIMELINE' | 'CREW' | 'INVENTORY' | 'CALENDAR'>('BLOCKS');
  const [blocks, setBlocks] = useState<Block[]>(DEMO_BLOCKS);

  const handleBlockCreated = (newBlock: Partial<Block>) => {
    setBlocks((prev) => [newBlock as Block, ...prev]);
    setActiveTab('BLOCKS');
  };

  return (
    <DepartmentLayout
      departmentCode="SNT"
      departmentTitle="Signal & Telecommunication Operations Center"
      departmentSubtitle="Delhi Division (NR) • Electronic Interlocking, Point Machines, AFTC Track Circuits & Axle Counters"
    >
      <div className="p-6 space-y-6">
        {/* Shadow Block Bundling Banner */}
        <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-500 text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-400 text-emerald-200">
                  SHADOW BLOCK OPPORTUNITY ACTIVE
                </span>
                <span className="text-xs font-mono text-white font-bold">
                  POINT 104A/B (SAHIBABAD JN)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-sans">
                Point machine overhaul BLK-SNT-SIG-03 co-scheduled within Civil Engineering Track Tamping window (02:15 - 03:45 IST). Zero additional traffic disruption.
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 font-mono text-xs font-bold shrink-0">
            Efficiency Gain: +42.5%
          </div>
        </div>

        {/* S&T Operational KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Point Machines Online</span>
              <h3 className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">86 / 86</h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                100% Interlocking Health
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">AFTC Track Circuits</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">142 <span className="text-xs text-cyan-400">Zones</span></h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                Zero Track Drop Faults
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Signal Aspect Health</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">99.8%</h3>
              <p className="text-[10px] text-slate-300 mt-1 font-mono">
                LED Lamp Filament Fit
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Shadow Co-Possessions</span>
              <h3 className="text-2xl font-extrabold font-mono text-cyan-400 mt-1">8 <span className="text-xs text-control-muted font-normal">Bundled</span></h3>
              <p className="text-[10px] text-cyan-300 mt-1 font-mono">
                Saved 18.5 hrs track time
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-control-border pb-3">
          <div className="flex rounded-xl border border-control-border bg-control-panel p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('BLOCKS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'BLOCKS' ? 'bg-emerald-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Signal Possessions
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'TIMELINE' ? 'bg-emerald-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Gantt Deconfliction
            </button>
            <button
              onClick={() => setActiveTab('CREW')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CREW' ? 'bg-emerald-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Signal Flying Squads
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'INVENTORY' ? 'bg-emerald-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Relays & Cards
            </button>
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CALENDAR' ? 'bg-emerald-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Division Calendar
            </button>
          </div>

          <button
            onClick={() => setActiveTab('PROPOSE')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <Plus className="w-4 h-4" />
            <span>Formulate S&T Shadow Block</span>
          </button>
        </div>

        {/* Dynamic Views */}
        {activeTab === 'PROPOSE' && (
          <BlockRequestForm
            departmentCode="SNT"
            onSuccess={handleBlockCreated}
            onCancel={() => setActiveTab('BLOCKS')}
          />
        )}

        {activeTab === 'BLOCKS' && (
          <BlockList initialBlocks={blocks} departmentFilter="SNT" />
        )}

        {activeTab === 'TIMELINE' && (
          <BlockTimeline corridorCode="NDLS-GZB-UP" />
        )}

        {activeTab === 'CREW' && (
          <CrewAssignment departmentFilter="SNT" />
        )}

        {activeTab === 'INVENTORY' && (
          <MaterialInventory departmentFilter="SNT" />
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarView />
        )}
      </div>
    </DepartmentLayout>
  );
};
