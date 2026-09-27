import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import { useBlockStore } from '../../stores/blockStore';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Block, BlockStatus } from '../../types';
import { playPendingProposalChime } from '../../services/soundService';
import {
  Sparkles,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
  AlertTriangle,
  Clock,
  Layers,
  Train,
  CheckCircle2,
  X,
} from 'lucide-react';

export type DemoMode = 'SEED' | 'RANDOM' | 'STREAM' | 'SCENARIO';

export const DemoControllerToolbar: React.FC = () => {
  const { addToast } = useToastStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<DemoMode>('SEED');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastConflictResult, setLastConflictResult] = useState<any | null>(null);

  // Switch Operational Mode
  const handleModeChange = (mode: DemoMode) => {
    setActiveMode(mode);
    addToast({
      type: 'info',
      title: `Operational Mode: ${mode}`,
      message:
        mode === 'SEED'
          ? 'Fixed Seed 26027 active. 100% repeatable deterministic baseline.'
          : mode === 'RANDOM'
          ? 'Stochastic randomized generation active with CoherenceEngine verification.'
          : mode === 'STREAM'
          ? 'Continuous 2Hz telemetry and real-time event ingestion stream.'
          : 'Interactive Scenario Script Player active for demonstration stories.',
    });
  };

  // Speed Dial Toggle
  const handleSpeedChange = (speed: number) => {
    setSpeedMultiplier(speed);
    setIsPaused(false);
    addToast({
      type: 'info',
      title: `Simulation Speed: ${speed}x`,
      message: `Corridor event playback rate adjusted to ${speed}x nominal speed.`,
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    addToast({
      type: !isPaused ? 'warning' : 'success',
      title: !isPaused ? 'Simulation Paused' : 'Simulation Resumed',
      message: !isPaused ? 'Corridor telemetry and event dispatch paused.' : 'Live event playback resumed.',
    });
  };

  // Conflict Injector Trigger - Directly updates store and UI
  const handleInjectConflict = async (conflictType: 'COMBINED_BLOCK' | 'TRAIN_PRECEDENCE' | 'RESOURCE_PHYSICS') => {
    setIsLoading(true);
    let injectedBlocks: Block[] = [];
    const now = Date.now();

    if (conflictType === 'COMBINED_BLOCK') {
      const engBlock: Block = {
        id: `blk-demo-eng-${now}`,
        block_code: 'BLK-ENG-TAM-901',
        department_code: 'ENG',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: 'Track Tamping (CSM)',
        start_km: 14.2,
        end_km: 17.8,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 30 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 210 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: false,
        gang_id: 'GANG-ENG-01',
        equipment_required: 'CSM-092 Continuous Action Tamper',
        work_description: 'USP #98 Track machine corridor occupation for mechanized tamping.',
        version: 1,
      };

      const trdBlock: Block = {
        id: `blk-demo-trd-${now + 1}`,
        block_code: 'BLK-TRD-OHE-902',
        department_code: 'TRD',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: '25kV Catenary Periodic Inspection',
        start_km: 15.0,
        end_km: 18.5,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 45 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 195 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: true,
        gang_id: 'GANG-TRD-01',
        equipment_required: 'TW-104 Tower Wagon',
        work_description: 'USP #98 25kV Catenary isolation and contact wire adjustment.',
        version: 1,
      };

      injectedBlocks = [engBlock, trdBlock];
      setLastConflictResult({
        title: 'ENG vs TRD Cross-Department Overlap (USP #98)',
        potential_time_savings_hours: 3.5,
        overlap_km_span: 2.5,
        ai_recommendation: 'Merge into Single Unified Combined Block (UP Main, KM 14.2-18.5). Saves 3.5 hrs track time.',
      });
    } else if (conflictType === 'TRAIN_PRECEDENCE') {
      const railBlock: Block = {
        id: `blk-demo-raj-${now}`,
        block_code: 'BLK-ENG-RAIL-905',
        department_code: 'ENG',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: 'Rail Fracture Restoration',
        start_km: 22.0,
        end_km: 26.5,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 15 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 165 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: true,
        gang_id: 'GANG-ENG-02',
        equipment_required: 'Flash Butt Welding Plant',
        work_description: 'Rail defect weld renewal. Conflicts with #12301 Rajdhani Express priority headway.',
        version: 1,
      };

      injectedBlocks = [railBlock];
      setLastConflictResult({
        title: 'Rajdhani Timetable Collision (#12301)',
        potential_time_savings_hours: 2.6,
        overlap_km_span: 4.5,
        ai_recommendation: 'AI Dynamic Breathing Window: Shift block slot +45m after #12301 clears section.',
      });
    } else {
      const gangBlock: Block = {
        id: `blk-demo-gang-${now}`,
        block_code: 'BLK-ENG-GANG-909',
        department_code: 'ENG',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'DOWN',
        work_type: 'Turnout Renewal & Packing',
        start_km: 95.0,
        end_km: 98.0,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 60 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 240 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: false,
        gang_id: 'GANG-ENG-01',
        equipment_required: 'Plasser Quick Relaying System',
        work_description: 'Rule 3 Violation: Gang GANG-ENG-01 assigned to 2 sites 160km apart within 1 hour.',
        version: 1,
      };

      injectedBlocks = [gangBlock];
      setLastConflictResult({
        title: 'Coherence Rule 3: Gang Travel Physics Violation',
        potential_time_savings_hours: 1.8,
        overlap_km_span: 3.0,
        ai_recommendation: 'Reassign to Section Gang GANG-ENG-03 stationed at KM 92 depot or delay start by 3.5 hrs.',
      });
    }

    // Always inject into blockStore and persist to localStorage
    const currentBlocks = useBlockStore.getState().blocks;
    const filteredCurrent = currentBlocks.filter((b) => !injectedBlocks.some((ib) => ib.id === b.id || ib.block_code === b.block_code));
    const merged = [...injectedBlocks, ...filteredCurrent];
    useBlockStore.setState({ blocks: merged, selectedBlockId: injectedBlocks[0]?.id || null });
    try {
      localStorage.setItem('railway_blocks_v1', JSON.stringify(merged));
    } catch {}

    // Dispatch update event to re-render all panels
    window.dispatchEvent(new CustomEvent('corridor_block_updated'));

    // Audio chime
    try {
      playPendingProposalChime('ENG');
    } catch {}

    // Trigger backend call non-blocking
    try {
      await fetch('/api/v1/demo/inject-conflict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_type: conflictType }),
      });
    } catch {}

    addToast({
      type: 'warning',
      title: `Conflict Injected: ${conflictType}`,
      message: `Injected into Corridor Queue. AI Sweep-Line has detected the conflict and prepared deconfliction options.`,
      durationMs: 7000,
    });

    setIsLoading(false);
  };

  // Quick Batch Block Generator
  const handleGenerateBlocks = async () => {
    setIsLoading(true);
    const now = Date.now();
    const batch: Block[] = [
      {
        id: `blk-batch-eng-${now}`,
        block_code: `BLK-ENG-${Math.floor(100 + Math.random() * 900)}`,
        department_code: 'ENG',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: 'Track Tamping (CSM)',
        start_km: 18.0,
        end_km: 22.4,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 90 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 270 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: false,
        gang_id: 'GANG-ENG-02',
        equipment_required: 'CSM-092 Tamper',
        work_description: 'Coherent scheduled mechanized track maintenance.',
        version: 1,
      },
      {
        id: `blk-batch-trd-${now + 1}`,
        block_code: `BLK-TRD-${Math.floor(100 + Math.random() * 900)}`,
        department_code: 'TRD',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: '25kV Catenary Periodic Inspection',
        start_km: 18.2,
        end_km: 21.0,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 100 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 240 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: true,
        gang_id: 'GANG-TRD-02',
        equipment_required: 'TW-108 Tower Car',
        work_description: 'OHE bracket insulator replacement and dropper tuning.',
        version: 1,
      },
      {
        id: `blk-batch-snt-${now + 2}`,
        block_code: `BLK-SNT-${Math.floor(100 + Math.random() * 900)}`,
        department_code: 'SNT',
        corridor: DEMO_BLOCKS[0].corridor,
        line_type: 'UP',
        work_type: 'Point Machine Testing & Overhaul',
        start_km: 19.0,
        end_km: 19.3,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 105 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 225 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: false,
        gang_id: 'GANG-SNT-02',
        equipment_required: 'Digital Point Gauge Kit',
        work_description: 'Track circuit bonding and axle counter inspection.',
        version: 1,
      },
      {
        id: `blk-batch-eng2-${now + 3}`,
        block_code: `BLK-ENG-${Math.floor(100 + Math.random() * 900)}`,
        department_code: 'ENG',
        corridor: DEMO_BLOCKS[1].corridor,
        line_type: 'DOWN',
        work_type: 'Ballast Cleaning Machine (BCM)',
        start_km: 8.5,
        end_km: 11.2,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 120 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 300 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: false,
        gang_id: 'GANG-ENG-03',
        equipment_required: 'BCM-RM-80 Machine',
        work_description: 'Shoulder ballast cleaning and screener operations.',
        version: 1,
      },
      {
        id: `blk-batch-trd2-${now + 4}`,
        block_code: `BLK-TRD-${Math.floor(100 + Math.random() * 900)}`,
        department_code: 'TRD',
        corridor: DEMO_BLOCKS[1].corridor,
        line_type: 'DOWN',
        work_type: 'OHE Neutral Section Renewal',
        start_km: 9.0,
        end_km: 10.5,
        status: 'PENDING_APPROVAL' as BlockStatus,
        scheduled_start_time: new Date(now + 130 * 60 * 1000).toISOString(),
        scheduled_end_time: new Date(now + 280 * 60 * 1000).toISOString(),
        traction_power_cutoff_required: true,
        gang_id: 'GANG-TRD-03',
        equipment_required: 'Heavy Wiring Train',
        work_description: 'Neutral section PTFE rod insulator maintenance.',
        version: 1,
      },
    ];

    const currentBlocks = useBlockStore.getState().blocks;
    const merged = [...batch, ...currentBlocks];
    useBlockStore.setState({ blocks: merged });
    try {
      localStorage.setItem('railway_blocks_v1', JSON.stringify(merged));
    } catch {}

    window.dispatchEvent(new CustomEvent('corridor_block_updated'));

    try {
      await fetch('/api/v1/demo/generate/blocks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5, mode: activeMode }),
      });
    } catch {}

    addToast({
      type: 'success',
      title: 'Batch Blocks Generated (+5)',
      message: `Generated 5 compliant maintenance blocks across ENG, TRD & SNT. Queue updated.`,
    });

    setIsLoading(false);
  };

  // Reset Simulation to Clean 4-Block Baseline
  const handleResetSimulation = () => {
    useBlockStore.setState({
      blocks: DEMO_BLOCKS,
      selectedBlockId: DEMO_BLOCKS[3]?.id || 'blk-004',
      activeAcknowledgement: null,
    });
    try {
      localStorage.removeItem('railway_blocks_v1');
      localStorage.removeItem('railway_local_blocks_v4');
      localStorage.removeItem('railway_last_ack_v1');
      localStorage.removeItem('railway_resolved_conflicts_v2');
      localStorage.setItem('railway_blocks_v1', JSON.stringify(DEMO_BLOCKS));
    } catch {}
    window.dispatchEvent(new CustomEvent('corridor_block_updated'));
    setLastConflictResult(null);
    addToast({
      type: 'info',
      title: 'Simulation Reset',
      message: 'Restored clean 4-block baseline for Delhi Division corridor.',
    });
  };

  // Quick Defect Generator
  const handleGenerateDefects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/demo/generate/defects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 4, mode: activeMode }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({
          type: 'warning',
          title: 'Infrastructure Defects Generated',
          message: `Generated ${data.count} track & OHE defects with LoF x CoF risk scoring.`,
        });
      }
    } catch {
      addToast({
        type: 'warning',
        title: 'Defects Simulated',
        message: 'Generated 4 critical track & catenary defects along the corridor.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Demo Controller Mini-Bar */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/60 text-white shadow-2xl shadow-cyan-950/60 backdrop-blur-md hover:border-cyan-400 hover:bg-slate-800 transition group"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <div className="text-left font-mono">
            <span className="text-[10px] text-cyan-400 uppercase tracking-widest block font-bold leading-none">
              DEMO CONTROLLER
            </span>
            <span className="text-xs font-extrabold text-white flex items-center gap-1.5 mt-0.5">
              <span>{activeMode}</span>
              <span className="text-slate-400">•</span>
              <span className={isPaused ? 'text-amber-400' : 'text-emerald-400'}>
                {isPaused ? 'PAUSED' : `${speedMultiplier}x`}
              </span>
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
          )}
        </button>
      </div>

      {/* Expanded Demo Control Center Modal */}
      {isOpen && (
        <div className="fixed bottom-20 left-5 z-50 w-[420px] max-w-[calc(100vw-40px)] bg-slate-900/95 border border-cyan-500/50 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl p-5 text-white font-sans animate-slideUp">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-control-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold font-mono text-white">
                  Demo Platform Command Console
                </h3>
                <p className="text-[10px] font-mono text-cyan-400/90">
                  PS 26027 • 4 OPERATIONAL MODES &amp; CONFLICT INJECTION
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Operational Mode Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
                <span className="text-slate-300 font-bold uppercase">1. Operational Mode</span>
                <span className="text-cyan-400 font-bold">
                  {activeMode === 'SEED' ? 'Seed: 26027' : activeMode}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['SEED', 'RANDOM', 'STREAM', 'SCENARIO'] as DemoMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={`py-1.5 px-2 rounded-lg font-mono text-[11px] font-bold border transition text-center ${
                      activeMode === mode
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50'
                        : 'bg-control-bg/60 border-control-border text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Simulation Speed Dial & Pause */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
                <span className="text-slate-300 font-bold uppercase">2. Stream Speed Dial</span>
                <span className={isPaused ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isPaused ? 'Telemetry Paused' : `${speedMultiplier}x Active`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[0.5, 1.0, 2.0, 5.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedChange(s)}
                    className={`py-1.5 rounded-lg font-mono text-[11px] font-bold border transition ${
                      speedMultiplier === s && !isPaused
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50'
                        : 'bg-control-bg/60 border-control-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
                <button
                  type="button"
                  onClick={togglePause}
                  className={`py-1.5 rounded-lg font-mono text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                    isPaused
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                      : 'bg-control-bg/60 border-control-border text-slate-400 hover:text-white'
                  }`}
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>
            </div>

            {/* 3. Conflict Injector (Hackathon Golden Scenarios) */}
            <div>
              <span className="text-slate-300 font-mono text-[11px] font-bold uppercase block mb-1.5">
                3. Conflict Injector (AI Demonstration)
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleInjectConflict('COMBINED_BLOCK')}
                  className="w-full text-left p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <strong className="text-xs text-white group-hover:text-cyan-300">
                        USP #98: ENG vs TRD Overlap
                      </strong>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Simulates 2.5km line overlap • Saves 3.5 hours track time
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                    INJECT
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleInjectConflict('TRAIN_PRECEDENCE')}
                  className="w-full text-left p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Train className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-xs text-white group-hover:text-amber-300">
                        Rajdhani Timetable Collision
                      </strong>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Prestige 12301 Express • Triggers AI Breathing Plan
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    INJECT
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleInjectConflict('RESOURCE_PHYSICS')}
                  className="w-full text-left p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <strong className="text-xs text-white group-hover:text-rose-300">
                        Rule 3: Gang Travel Physics
                      </strong>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      160km in 1 hr (160 km/h) • Violates &le;40 km/h rule
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                    INJECT
                  </span>
                </button>
              </div>
            </div>

            {/* Injected Conflict Result Banner */}
            {lastConflictResult && (
              <div className="p-3 rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-cyan-200 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>{lastConflictResult.title}</span>
                  {lastConflictResult.potential_time_savings_hours && (
                    <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 text-[10px]">
                      +{lastConflictResult.potential_time_savings_hours}h Saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-sans text-slate-300">
                  {lastConflictResult.ai_recommendation}
                </p>
              </div>
            )}

            {/* 4. Quick Data Generators & Simulation Controls */}
            <div className="pt-2 border-t border-control-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGenerateBlocks}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-control-border font-mono text-[11px] text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+5 Coherent Blocks</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGenerateDefects}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-control-border font-mono text-[11px] text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>+4 Track Defects</span>
                </button>
              </div>

              {/* Reset to Clean Baseline */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleResetSimulation}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 font-mono text-[11px] text-rose-300 flex items-center justify-center gap-1.5 transition font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Simulation to Baseline (4 Blocks)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
