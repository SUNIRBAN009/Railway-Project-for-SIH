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
  Zap,
  Plus,
  Radio,
  Clock,
  Layers,
  Calendar,
  Users,
  Package,
  Activity,
  ShieldCheck,
  PowerOff,
} from 'lucide-react';

export const TrdDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BLOCKS' | 'PROPOSE' | 'TIMELINE' | 'CREW' | 'INVENTORY' | 'CALENDAR'>('BLOCKS');
  const [blocks, setBlocks] = useState<Block[]>(DEMO_BLOCKS);

  const handleBlockCreated = (newBlock: Partial<Block>) => {
    setBlocks((prev) => [newBlock as Block, ...prev]);
    setActiveTab('BLOCKS');
  };

  return (
    <DepartmentLayout
      departmentCode="TRD"
      departmentTitle="Traction Power & OHE Distribution Command"
      departmentSubtitle="Delhi Division (NR) • 25kV AC Catenary Feeder Isolation, Tower Wagons & Substation Telemetry"
    >
      <div className="p-6 space-y-6">
        {/* 25kV Feeder Telemetry Bar */}
        <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-950/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-900/60 border border-amber-500 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-amber-900/70 border border-amber-400 text-amber-200">
                  25kV FEEDER SUBSTATION STATUS
                </span>
                <span className="text-xs font-mono text-white font-bold">
                  FEEDER SECTION NDLS–GZB (UP LINE)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-sans">
                Permit-to-Work #PTW-TRD-441 authorized for Tower Wagon TW-104. Earthing discharge rods deployed at KM 14.0 and 15.5.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs shrink-0">
            <div className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/60 text-amber-300 flex items-center gap-2">
              <PowerOff className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>ISOLATED: 25kV ZERO VOLTS</span>
            </div>
          </div>
        </div>

        {/* TRD KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Tower Wagons Deployed</span>
              <h3 className="text-2xl font-extrabold font-mono text-amber-400 mt-1">1 <span className="text-xs text-control-muted font-normal">Active</span></h3>
              <p className="text-[10px] text-slate-300 mt-1 font-mono">
                TW-104 at Sahibabad Yard
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Catenary Tension</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">1,000 <span className="text-xs text-cyan-400">kgf</span></h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                Nominal 25kV Target Met
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Droppers Renewed</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">142 <span className="text-xs text-control-muted font-normal">Units</span></h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                Current month overhaul
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Neutral Sections</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">0 <span className="text-xs text-control-muted font-normal">Defects</span></h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                All 6 Section Insulators Fit
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-control-border pb-3">
          <div className="flex rounded-xl border border-control-border bg-control-panel p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('BLOCKS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'BLOCKS' ? 'bg-amber-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Power Shutdown Blocks
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'TIMELINE' ? 'bg-amber-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Gantt Deconfliction
            </button>
            <button
              onClick={() => setActiveTab('CREW')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CREW' ? 'bg-amber-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              OHE Gangs & Wagons
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'INVENTORY' ? 'bg-amber-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Copper & Wire Stores
            </button>
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CALENDAR' ? 'bg-amber-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Division Calendar
            </button>
          </div>

          <button
            onClick={() => setActiveTab('PROPOSE')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-950"
          >
            <Plus className="w-4 h-4" />
            <span>Formulate OHE Power Block</span>
          </button>
        </div>

        {/* Dynamic Views */}
        {activeTab === 'PROPOSE' && (
          <BlockRequestForm
            departmentCode="TRD"
            onSuccess={handleBlockCreated}
            onCancel={() => setActiveTab('BLOCKS')}
          />
        )}

        {activeTab === 'BLOCKS' && (
          <BlockList initialBlocks={blocks} departmentFilter="TRD" />
        )}

        {activeTab === 'TIMELINE' && (
          <BlockTimeline corridorCode="NDLS-GZB-UP" />
        )}

        {activeTab === 'CREW' && (
          <CrewAssignment departmentFilter="TRD" />
        )}

        {activeTab === 'INVENTORY' && (
          <MaterialInventory departmentFilter="TRD" />
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarView />
        )}
      </div>
    </DepartmentLayout>
  );
};
