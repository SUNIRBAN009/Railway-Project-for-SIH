import React, { useState } from 'react';
import { ControlRoomLayout } from '../layouts/ControlRoomLayout';
import { PendingBlocksQueue } from '../components/coa/PendingBlocksQueue';
import { BlockSanctionPanel } from '../components/coa/BlockSanctionPanel';
import { ConflictResolutionPanel } from '../components/coa/ConflictResolutionPanel';
import { TrainImpactPanel } from '../components/coa/TrainImpactPanel';
import { EmergencyBlockButton } from '../components/coa/EmergencyBlockButton';
import { CoPossessionOptimizer } from '../components/coa/CoPossessionOptimizer';
import { DepartmentChatRoom } from '../components/coa/DepartmentChatRoom';
import { WeatherAdvisoryPanel } from '../components/coa/WeatherAdvisoryPanel';
import { Block, BlockStatus } from '../types';
import { useLiveBlocks } from '../hooks/useLiveBlocks';
import { Link } from 'react-router-dom';
import { printCorridorDailyPossessionSheet } from '../utils/exportPdf';
import { exportBlocksToCsv } from '../utils/exportCsv';
import { useBlockStore } from '../stores/blockStore';
import { useAuthStore } from '../stores/authStore';
import { DEMO_BLOCKS } from '../services/demoData';
import {
  Activity,
  Maximize2,
  CheckCircle2,
  TrendingUp,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  FileDown,
  Download,
  RefreshCw,
} from 'lucide-react';
import { analyticsService, triggerBlobDownload } from '../services/api';

export const ControlRoomDashboard: React.FC = () => {
  const { blocks: storeBlocks, sanctionBlock, reviseBlock, submitBlockProposal } = useBlockStore();
  const { user } = useAuthStore();
  const { blocks: liveBlocks, setBlocks, refetch } = useLiveBlocks();
  const blocks = liveBlocks && liveBlocks.length > 0 ? liveBlocks : storeBlocks;
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('blk-004');

  const activeSelectedId = selectedBlockId || (blocks.length > 0 ? blocks[0].id : null);
  const selectedBlock = blocks.find((b) => b.id === activeSelectedId) || (blocks.length > 0 ? blocks[0] : null);


  const handleSelectBlock = (block: Block) => {
    setSelectedBlockId(block.id);
  };

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadCorridorReport = async (reportType: 'PDF' | 'SANCTION_BULLETIN' = 'PDF') => {
    try {
      setIsDownloadingReport(true);
      const blob = await analyticsService.downloadCorridorReport({
        corridor: 'NDLS-CNB',
        division: 'DLI',
        type: reportType,
        range: '7d',
      });
      const filePrefix = reportType === 'SANCTION_BULLETIN' ? 'IR_Sanction_Bulletin' : 'IR_Executive_Audit';
      const filename = `${filePrefix}_NDLS-CNB_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      console.error('Failed to download PDF report:', err);
      alert('Failed to download Corridor PDF Report. Please check backend connection.');
    } finally {
      setIsDownloadingReport(false);
    }
  };


  const handleSanctionSuccess = (updatedBlock: Block) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === updatedBlock.id ? { ...b, ...updatedBlock } : b))
    );
    // Refresh to get latest state from backend
    setTimeout(() => {
      refetch();
    }, 400);
  };

  const handleSanction = (blockId: string, remarks: string) => {
    sanctionBlock(
      blockId,
      remarks,
      user?.first_name ? `${user.first_name} ${user.last_name} (${user.role})` : 'Chief Operating Controller (COA)'
    );
  };

  const handleConditionalSanction = (blockId: string, cautionSpeed: number, remarks: string) => {
    sanctionBlock(
      blockId,
      remarks,
      user?.first_name ? `${user.first_name} ${user.last_name} (${user.role})` : 'Chief Operating Controller (COA)',
      cautionSpeed
    );
  };

  const handleRevise = (blockId: string, reason: string) => {
    reviseBlock(
      blockId,
      reason,
      user?.first_name ? `${user.first_name} ${user.last_name} (${user.role})` : 'Chief Operating Controller (COA)'
    );
  };

  const handleDeclareEmergency = (corridor: string, kmLocation: number, reason: string) => {
    const emergencyBlock: Block = {
      id: `blk-emg-${Date.now()}`,
      block_code: `EMG-${corridor.substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
      corridor: blocks[0]?.corridor || DEMO_BLOCKS[0].corridor,
      line_type: 'UP',
      department_code: 'ENG',
      work_type: `EMERGENCY HALT: ${reason}`,
      status: 'ACTIVE',
      start_km: kmLocation - 0.2,
      end_km: kmLocation + 0.2,
      scheduled_start_time: new Date().toISOString(),
      scheduled_end_time: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      traction_power_cutoff_required: true,
      work_description: `IMMEDIATE SECTION HALT ENFORCED BY CHIEF CONTROLLER: ${reason}`,
      version: 1,
    };
    submitBlockProposal(emergencyBlock, user?.username || 'Chief Controller');
    setSelectedBlockId(emergencyBlock.id);
  };

  return (
    <ControlRoomLayout>
      <div className="p-6 space-y-6">
        {/* Top Header & Fast Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-control-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                Central Operations Command & Control Room (COA)
              </h2>
            </div>
            <p className="text-xs text-control-muted mt-1 font-mono">
              Delhi Division (NR) • Real-time block authority, sweep-line deconfliction & shadow optimization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* One-Click Download Corridor Report (ReportLab PDF) */}
            <button
              onClick={() => handleDownloadCorridorReport('PDF')}
              disabled={isDownloadingReport}
              title="Download Official Corridor Operations Audit & KPI Report (PDF)"
              className="px-3.5 py-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isDownloadingReport ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileDown className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isDownloadingReport ? 'Downloading...' : 'Corridor Report (PDF)'}</span>
            </button>

            {/* Official Sanction Bulletin PDF */}
            <button
              onClick={() => handleDownloadCorridorReport('SANCTION_BULLETIN')}
              disabled={isDownloadingReport}
              title="Download Official Daily Corridor Block Sanction Bulletin (PDF)"
              className="px-3 py-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 text-cyan-400" />
              <span>Sanction Bulletin</span>
            </button>


            <button
              onClick={() => exportBlocksToCsv(blocks)}
              title="Download Blocks Schedule Data in CSV format"
              className="px-3 py-2 rounded-xl border border-control-border bg-control-panel hover:bg-control-bg text-control-muted hover:text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4 text-control-muted" />
              <span>CSV</span>
            </button>

            <EmergencyBlockButton onDeclareEmergency={handleDeclareEmergency} />
            <Link
              to="/bigscreen"
              className="px-3.5 py-2 rounded-xl border border-control-border bg-control-panel hover:bg-control-bg text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <span>Big Screen (4K Wall)</span>
            </Link>
          </div>
        </div>

        {/* Operational KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-control-panel border border-control-border p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-control-muted uppercase font-mono">Division Punctuality</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">98.4%</p>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>+1.2% vs baseline</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-control-muted uppercase font-mono">Active Possessions</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                {blocks.filter((b) => b.status === 'ACTIVE').length} <span className="text-xs font-normal text-control-muted">Active</span>
              </p>
              <span className="text-[10px] text-slate-300 font-mono mt-0.5 block">
                NDLS–GZB Corridors
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-control-muted uppercase font-mono">Queued For Sanction</span>
              <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">
                {blocks.filter((b) => ['SUBMITTED', 'COORDINATED', 'PENDING_APPROVAL'].includes(b.status)).length}
              </p>
              <span className="text-[10px] text-cyan-300 font-mono mt-0.5 block">
                Awaiting COA Decision
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-control-panel border border-control-border p-4 rounded-xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-control-muted uppercase font-mono">Shadow Bundling Gain</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">+42.5%</p>
              <span className="text-[10px] text-purple-300 font-mono mt-0.5 block">
                Track Time Saved: 3.2 hrs
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Main Work Area: Queue + Sanction Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <PendingBlocksQueue
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={handleSelectBlock}
            />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <BlockSanctionPanel
              block={selectedBlock}
              onSanction={handleSanction}
              onConditionalSanction={handleConditionalSanction}
              onRevise={handleRevise}
              onSanctionSuccess={handleSanctionSuccess}
              onRefresh={refetch}
            />

            <ConflictResolutionPanel block={selectedBlock} />
          </div>
        </div>

        {/* Secondary Row: Train Impact Assessment & Shadow Bundling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrainImpactPanel />
          <CoPossessionOptimizer block={selectedBlock} />
        </div>

        {/* Tertiary Row: Weather Telemetry & Department Comms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeatherAdvisoryPanel />
          <DepartmentChatRoom />
        </div>
      </div>
    </ControlRoomLayout>
  );
};
