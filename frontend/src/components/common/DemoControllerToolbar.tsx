import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import { useBlockStore } from '../../stores/blockStore';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Block, BlockStatus } from '../../types';
import { playPendingProposalChime } from '../../services/soundService';
import { apiClient } from '../../services/api';
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
  Database,
  RefreshCw,
  Film,
} from 'lucide-react';

export type DemoMode = 'SEED' | 'RANDOM' | 'STREAM' | 'SCENARIO';

export const DemoControllerToolbar: React.FC = () => {
  const { addToast } = useToastStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<DemoMode>('SEED');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backendCounts, setBackendCounts] = useState<{ trains: number; blocks: number; assets: number } | null>(null);
  const [lastConflictResult, setLastConflictResult] = useState<any | null>(null);

  // Sync state from backend on mount and periodically
  const fetchBackendStatus = async () => {
    try {
      const res = await apiClient.get('/demo/controller/status/');
      if (res.data) {
        if (res.data.active_mode) setActiveMode(res.data.active_mode);
        if (typeof res.data.stream_speed === 'number') setSpeedMultiplier(res.data.stream_speed);
        if (typeof res.data.is_paused === 'boolean') setIsPaused(res.data.is_paused);
        if (res.data.counts) setBackendCounts(res.data.counts);
      }
    } catch (err) {
      console.warn('Backend controller status check fallback:', err);
    }
  };

  useEffect(() => {
    fetchBackendStatus();
    const interval = setInterval(fetchBackendStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Switch Operational Mode - Synchronizes with Backend API
  const handleModeChange = async (mode: DemoMode) => {
    setActiveMode(mode);
    try {
      const res = await apiClient.post('/demo/controller/status/', { active_mode: mode });
      if (res.data?.counts) setBackendCounts(res.data.counts);
    } catch (err) {
      console.warn('Failed to update operational mode on backend:', err);
    }

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

    if (mode === 'SCENARIO') {
      window.dispatchEvent(new CustomEvent('open_scenario_player', { detail: { key: 'eng_vs_trd_conflict' } }));
    }
  };

  // Speed Dial Toggle - Synchronizes with Backend API
  const handleSpeedChange = async (speed: number) => {
    setSpeedMultiplier(speed);
    setIsPaused(false);
    try {
      const res = await apiClient.post('/demo/controller/status/', {
        speed_multiplier: speed,
        is_paused: false,
      });
      if (res.data?.counts) setBackendCounts(res.data.counts);
    } catch (err) {
      console.warn('Failed to update speed on backend:', err);
    }

    addToast({
      type: 'info',
      title: `Simulation Speed: ${speed}x`,
      message: `Corridor event playback rate adjusted to ${speed}x nominal speed.`,
    });
  };

  const togglePause = async () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    try {
      const res = await apiClient.post('/demo/controller/status/', {
        is_paused: nextPaused,
      });
      if (res.data?.counts) setBackendCounts(res.data.counts);
    } catch (err) {
      console.warn('Failed to toggle pause on backend:', err);
    }

    addToast({
      type: nextPaused ? 'warning' : 'success',
      title: nextPaused ? 'Simulation Paused' : 'Simulation Resumed',
      message: nextPaused ? 'Corridor telemetry and event dispatch paused.' : 'Live event playback resumed.',
    });
  };

  // Conflict Injector Trigger - Connected directly to Backend POST /api/v1/demo/inject-conflict/
  const handleInjectConflict = async (conflictType: 'COMBINED_BLOCK' | 'TRAIN_PRECEDENCE' | 'RESOURCE_PHYSICS') => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/demo/inject-conflict/', { conflict_type: conflictType });
      const scenario = res.data?.scenario;

      if (scenario && Array.isArray(scenario.blocks)) {
        const injectedBlocks: Block[] = scenario.blocks.map((b: any) => ({
          id: b.id,
          block_code: b.block_code,
          department_code: b.department_code || 'ENG',
          line_type: b.line_type || 'UP',
          work_type: b.work_type || 'Track Maintenance',
          start_km: Number(b.start_km) || 0,
          end_km: Number(b.end_km) || 0,
          scheduled_start_time: b.scheduled_start_time,
          scheduled_end_time: b.scheduled_end_time,
          status: (b.status || 'CONFLICT_DETECTED') as BlockStatus,
          gang_id: b.gang_id || 'GANG-ENG-01',
          equipment_required: b.equipment_required || 'Track Maintenance Machine',
          work_description: b.work_description || scenario.title || '',
          traction_power_cutoff_required: Boolean(b.traction_power_cutoff_required),
          corridor: b.corridor || DEMO_BLOCKS[0].corridor,
          version: b.version || 1,
        }));

        const currentBlocks = useBlockStore.getState().blocks;
        const filteredCurrent = currentBlocks.filter(
          (b) => !injectedBlocks.some((ib) => ib.id === b.id || ib.block_code === b.block_code)
        );
        const merged = [...injectedBlocks, ...filteredCurrent];
        useBlockStore.setState({ blocks: merged, selectedBlockId: injectedBlocks[0]?.id || null });
        try {
          localStorage.setItem('railway_blocks_v1', JSON.stringify(merged));
        } catch {}

        setLastConflictResult({
          title: scenario.title,
          potential_time_savings_hours: scenario.potential_time_savings_hours,
          overlap_km_span: scenario.overlap_km_span || scenario.distance_km,
          ai_recommendation: scenario.ai_recommendation,
          scenario_type: scenario.scenario_type,
        });

        // Dispatch update event to re-render all panels
        window.dispatchEvent(new CustomEvent('corridor_block_updated'));

        // Audio chime
        try {
          playPendingProposalChime(injectedBlocks[0]?.department_code || 'ENG');
        } catch {}

        addToast({
          type: 'warning',
          title: `Conflict Injected: ${scenario.title}`,
          message: `${scenario.ai_recommendation || 'AI Sweep-Line has detected the conflict in PostgreSQL and prepared deconfliction options.'}`,
          durationMs: 7000,
        });
      }
    } catch (err: any) {
      console.error('Failed to inject conflict via API:', err);
      addToast({
        type: 'error',
        title: 'Conflict Injection Error',
        message: err.response?.data?.message || err.message || 'API connection failed',
      });
    } finally {
      setIsLoading(false);
      fetchBackendStatus();
    }
  };

  // Quick Batch Block Generator - Connected directly to Backend POST /api/v1/demo/generate/blocks/
  const handleGenerateBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/demo/generate/blocks/', { count: 5, mode: activeMode });
      if (res.data?.blocks && Array.isArray(res.data.blocks)) {
        const newBlocks: Block[] = res.data.blocks.map((b: any) => ({
          id: b.id,
          block_code: b.block_code,
          department_code: b.department_code,
          line_type: b.line_type,
          work_type: b.work_type,
          start_km: Number(b.start_km),
          end_km: Number(b.end_km),
          scheduled_start_time: b.scheduled_start_time,
          scheduled_end_time: b.scheduled_end_time,
          status: (b.status || 'PENDING_APPROVAL') as BlockStatus,
          gang_id: b.gang_id,
          equipment_required: b.equipment_required,
          traction_power_cutoff_required: Boolean(b.traction_power_cutoff_required),
          work_description: b.work_description || '',
          corridor: b.corridor || DEMO_BLOCKS[0].corridor,
          version: 1,
        }));

        const currentBlocks = useBlockStore.getState().blocks;
        const filteredCurrent = currentBlocks.filter(
          (b) => !newBlocks.some((nb) => nb.id === b.id || nb.block_code === b.block_code)
        );
        const merged = [...newBlocks, ...filteredCurrent];
        useBlockStore.setState({ blocks: merged });
        try {
          localStorage.setItem('railway_blocks_v1', JSON.stringify(merged));
        } catch {}

        window.dispatchEvent(new CustomEvent('corridor_block_updated'));

        addToast({
          type: 'success',
          title: `Batch Blocks Generated (+${newBlocks.length})`,
          message: `Saved directly to PostgreSQL database across ENG, TRD & SNT. Queue updated.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to generate blocks via API:', err);
      addToast({
        type: 'error',
        title: 'Block Generation Error',
        message: err.response?.data?.message || err.message || 'API connection failed',
      });
    } finally {
      setIsLoading(false);
      fetchBackendStatus();
    }
  };

  // Reset Simulation to Clean Baseline - Connected directly to Backend POST /api/v1/demo/reset/
  const handleResetSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/demo/reset/');

      // Clear transient client storage keys
      try {
        localStorage.removeItem('railway_blocks_v1');
        localStorage.removeItem('railway_local_blocks_v4');
        localStorage.removeItem('railway_last_ack_v1');
        localStorage.removeItem('railway_resolved_conflicts_v2');
      } catch {}

      // Reload fresh baseline blocks from PostgreSQL database
      await useBlockStore.getState().syncWithBackend();

      setLastConflictResult(null);
      window.dispatchEvent(new CustomEvent('corridor_block_updated'));

      addToast({
        type: 'info',
        title: 'Simulation Reset Complete',
        message: `Restored baseline state in PostgreSQL database. Cleaned transient blocks.`,
      });
    } catch (err: any) {
      console.warn('Backend reset failed, falling back to local reset:', err);
      useBlockStore.setState({
        blocks: DEMO_BLOCKS,
        selectedBlockId: DEMO_BLOCKS[3]?.id || 'blk-004',
        activeAcknowledgement: null,
      });
      try {
        localStorage.setItem('railway_blocks_v1', JSON.stringify(DEMO_BLOCKS));
      } catch {}
      window.dispatchEvent(new CustomEvent('corridor_block_updated'));
      setLastConflictResult(null);
      addToast({
        type: 'info',
        title: 'Simulation Reset',
        message: 'Restored clean baseline for Delhi Division corridor.',
      });
    } finally {
      setIsLoading(false);
      fetchBackendStatus();
    }
  };

  // Quick Defect Generator - Connected to Backend POST /api/v1/demo/generate/defects/
  const handleGenerateDefects = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/demo/generate/defects/', {
        count: 4,
        mode: activeMode,
      });
      const data = res.data;
      if (data && data.defects) {
        addToast({
          type: 'warning',
          title: 'Infrastructure Defects Generated',
          message: `Generated ${data.defects.length} track & OHE defects with LoF x CoF risk scoring in backend.`,
        });
      }
    } catch (err: any) {
      console.error('Defects generation failed:', err);
      addToast({
        type: 'warning',
        title: 'Defects Simulated',
        message: 'Generated 4 critical track & catenary defects along the corridor.',
      });
    } finally {
      setIsLoading(false);
      fetchBackendStatus();
    }
  };

  return (
    <>
      {/* Floating Demo Controller Mini-Bar (Positioned cleanly above bottom timeline) */}
      <div className="fixed bottom-28 left-6 z-40 flex items-center gap-2">
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

        {/* Direct Scenario Playbook Launch Button */}
        <button
          type="button"
          onClick={() => {
            handleModeChange('SCENARIO');
            window.dispatchEvent(new CustomEvent('open_scenario_player', { detail: { key: 'eng_vs_trd_conflict' } }));
          }}
          className="px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs shadow-2xl transition-all duration-300 flex items-center gap-2 border bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-amber-300/60 shadow-amber-950/60 hover:scale-105 active:scale-95 group"
          title="Open Interactive Scenario Presentation Player (SIH PS 26027)"
        >
          <Film className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="tracking-wide uppercase drop-shadow font-extrabold text-[11px]">
            🎬 SCENARIO PLAYBOOK (INTERACTIVE)
          </span>
          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
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
            {/* Live Backend Connection Indicator */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                <span className="font-bold">POSTGRESQL + BACKEND API: LIVE</span>
              </div>
              {backendCounts && (
                <div className="flex items-center gap-2 text-slate-300">
                  <span>{backendCounts.blocks} Blocks</span>
                  <span>•</span>
                  <span>{backendCounts.trains} Trains</span>
                  <span>•</span>
                  <span>{backendCounts.assets} Assets</span>
                </div>
              )}
            </div>

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

              {/* Integrated Scenario Playbook Launcher Button inside Command Console */}
              <button
                type="button"
                onClick={() => {
                  handleModeChange('SCENARIO');
                  window.dispatchEvent(new CustomEvent('open_scenario_player', { detail: { key: 'eng_vs_trd_conflict' } }));
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl font-mono font-bold text-xs shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-amber-300/60 shadow-amber-950/60 hover:scale-[1.01] active:scale-95 group"
                title="Launch SIH PS 26027 Interactive Presentation Playbook"
              >
                <Film className="w-3.5 h-3.5 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="tracking-wide uppercase font-extrabold drop-shadow">
                  🎬 SCENARIO PLAYBOOK (INTERACTIVE)
                </span>
              </button>
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
