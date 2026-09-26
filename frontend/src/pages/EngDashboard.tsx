import React, { useState } from 'react';
import { DepartmentLayout } from '../layouts/DepartmentLayout';
import { BlockList } from '../components/blocks/BlockList';
import { BlockRequestForm } from '../components/blocks/BlockRequestForm';
import { BlockTimeline } from '../components/blocks/BlockTimeline';
import { CrewAssignment } from '../components/departments/CrewAssignment';
import { MaterialInventory } from '../components/departments/MaterialInventory';
import { CalendarView } from '../components/blocks/CalendarView';
import { Block } from '../types';
import { useBlockStore } from '../stores/blockStore';
import { useLiveBlocks } from '../hooks/useLiveBlocks';
import { useRiskMatrix } from '../hooks/useRiskMatrix';
import { WhyNumberOneCard } from '../components/common/WhyNumberOneCard';
import { RiskMatrixModal } from '../components/common/RiskMatrixModal';
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
  Grid,
} from 'lucide-react';

export const EngDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BLOCKS' | 'PROPOSE' | 'TIMELINE' | 'CREW' | 'INVENTORY' | 'CALENDAR'>('BLOCKS');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const { submitBlockProposal } = useBlockStore();
  const { blocks, setBlocks, refetch } = useLiveBlocks('ENG');
  const { riskMatrix, whyNumberOne } = useRiskMatrix('NDLS-CNB-MAIN');

  const handleBlockCreated = async (newBlock: Partial<Block>) => {
    setActiveTab('BLOCKS');
    refetch();
  };

  return (
    <DepartmentLayout
      departmentCode="ENG"
      departmentTitle="Civil Engineering & Permanent Way Command"
      departmentSubtitle="Delhi Division (NR) • Mechanized Track Maintenance, Tamping & Ballast Operations"
    >
      <div className="p-6 space-y-6">
        {/* Dynamic Explainable AI Priority #1 Card (Feature #94) */}
        <WhyNumberOneCard
          data={whyNumberOne}
          onOpenRiskMatrix={() => setIsRiskModalOpen(true)}
          onDeclareEmergencyBlock={() => setActiveTab('PROPOSE')}
        />

        {/* 5x5 Risk Matrix Heatmap Modal (Feature #92) */}
        <RiskMatrixModal
          isOpen={isRiskModalOpen}
          onClose={() => setIsRiskModalOpen(false)}
          data={riskMatrix}
          onSelectDefect={(defect) => {
            setIsRiskModalOpen(false);
            setActiveTab('PROPOSE');
          }}
        />

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
          <BlockTimeline corridorCode="NDLS-CNB-MAIN" />
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
