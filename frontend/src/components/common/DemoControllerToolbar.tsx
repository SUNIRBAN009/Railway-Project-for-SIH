import React, { useState, useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
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

  // Conflict Injector Trigger
  const handleInjectConflict = async (conflictType: 'COMBINED_BLOCK' | 'TRAIN_PRECEDENCE' | 'RESOURCE_PHYSICS') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/demo/inject-conflict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_type: conflictType }),
      });
      const data = await res.json();
      if (res.ok && data.scenario) {
        setLastConflictResult(data.scenario);
        addToast({
          type: 'warning',
          title: `Conflict Injected: ${data.scenario.title}`,
          message: data.scenario.ai_recommendation,
          durationMs: 7000,
        });
      }
    } catch {
      // Fallback local simulation
      if (conflictType === 'COMBINED_BLOCK') {
        setLastConflictResult({
          title: 'ENG vs TRD Cross-Department Overlap (USP #98)',
          potential_time_savings_hours: 3.5,
          overlap_km_span: 2.5,
          ai_recommendation: 'Merge into Single Unified Combined Block (UP Main, KM 14.2-18.5). Saves 3.5 hrs track time.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Batch Block Generator
  const handleGenerateBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/demo/generate/blocks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5, mode: activeMode }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Batch Blocks Generated',
          message: `Generated ${data.count} maintenance blocks. 100% compliant with 7 Coherence Rules.`,
        });
      }
    } catch {
      addToast({
        type: 'info',
        title: 'Blocks Simulated',
        message: 'Generated 5 compliant maintenance block proposals for NDLS-CNB corridor.',
      });
    } finally {
      setIsLoading(false);
    }
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

            {/* 4. Quick Data Generators */}
            <div className="pt-2 border-t border-control-border grid grid-cols-2 gap-2">
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
          </div>
        </div>
      )}
    </>
  );
};
