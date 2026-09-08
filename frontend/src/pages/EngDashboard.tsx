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
  Wrench,
  Plus,
  AlertTriangle,
  Layers,
  Calendar,
  Users,
  Package,
  Activity,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const EngDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BLOCKS' | 'PROPOSE' | 'TIMELINE' | 'CREW' | 'INVENTORY' | 'CALENDAR'>('BLOCKS');
  const [blocks, setBlocks] = useState<Block[]>(DEMO_BLOCKS);

  const handleBlockCreated = (newBlock: Partial<Block>) => {
    setBlocks((prev) => [newBlock as Block, ...prev]);
    setActiveTab('BLOCKS');
  };

  return (
    <DepartmentLayout
      departmentCode="ENG"
      departmentTitle="Civil Engineering & Permanent Way Command"
      departmentSubtitle="Delhi Division (NR) • Mechanized Track Maintenance, Tamping & Ballast Operations"
    >
      <div className="p-6 space-y-6">
        {/* Urgent USFD Rail Flaw Warning Banner */}
        <div className="p-4 rounded-xl border border-rose-500/60 bg-rose-950/40 shadow-lg shadow-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-900/60 border border-rose-500 text-rose-300 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-rose-900/80 border border-rose-500 text-white">
                  EMERGENCY DEFECT LOG
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  KM 14.800 (NDLS–GZB UP LINE)
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-1 font-sans">
                Transverse rail fatigue defect detected by USFD Trolley #03. Jogglled fishplate clamping required immediately under speed restriction 30 km/h.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('PROPOSE')}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition shrink-0 shadow-md shadow-rose-950"
          >
            Declare Emergency Block
          </button>
        </div>

        {/* Top Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Monthly Tamping Span</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">42.8 <span className="text-xs text-cyan-400">KM</span></h3>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                <TrendingUp className="w-3 h-3" />
                <span>+14.2% vs target</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-400">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Ballast Screened (BCM)</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">12.4 <span className="text-xs text-cyan-400">KM</span></h3>
              <p className="text-[10px] text-control-muted mt-1 font-mono">
                Target: 15.0 KM (82.6%)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Active Possessions</span>
              <h3 className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">1 <span className="text-xs text-control-muted font-normal">Active</span></h3>
              <p className="text-[10px] text-slate-300 mt-1 font-mono">
                CSM-092 at KM 14.2
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-control-muted uppercase">Machinery Fitness Rate</span>
              <h3 className="text-2xl font-extrabold font-mono text-white mt-1">100%</h3>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span>3/3 Machines Fit</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-control-border pb-3">
          <div className="flex rounded-xl border border-control-border bg-control-panel p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('BLOCKS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'BLOCKS' ? 'bg-blue-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Track Possessions
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'TIMELINE' ? 'bg-blue-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Gantt Deconfliction
            </button>
            <button
              onClick={() => setActiveTab('CREW')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CREW' ? 'bg-blue-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Gangs & Crews
            </button>
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'INVENTORY' ? 'bg-blue-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Track Materials
            </button>
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'CALENDAR' ? 'bg-blue-600 text-white font-bold' : 'text-control-muted hover:text-white'
              }`}
            >
              Division Calendar
            </button>
          </div>

          <button
            onClick={() => setActiveTab('PROPOSE')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-950"
          >
            <Plus className="w-4 h-4" />
            <span>Formulate Block Request</span>
          </button>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === 'PROPOSE' && (
          <BlockRequestForm
            departmentCode="ENG"
            onSuccess={handleBlockCreated}
            onCancel={() => setActiveTab('BLOCKS')}
          />
        )}

        {activeTab === 'BLOCKS' && (
          <BlockList initialBlocks={blocks} departmentFilter="ENG" />
        )}

        {activeTab === 'TIMELINE' && (
          <BlockTimeline corridorCode="NDLS-GZB-UP" />
        )}

        {activeTab === 'CREW' && (
          <CrewAssignment departmentFilter="ENG" />
        )}

        {activeTab === 'INVENTORY' && (
          <MaterialInventory departmentFilter="ENG" />
        )}

        {activeTab === 'CALENDAR' && (
          <CalendarView />
        )}
      </div>
    </DepartmentLayout>
  );
};
