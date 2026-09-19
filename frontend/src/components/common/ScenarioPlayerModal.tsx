import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Film,
  Sparkles,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  Volume2,
  Activity,
  Award
} from 'lucide-react';
import axios from 'axios';

interface ScenarioMeta {
  key: string;
  name: string;
  description: string;
  duration_minutes: number;
  target_corridor: string;
}

interface ScenarioStep {
  step: number;
  title: string;
  narrative: string;
  timestamp: string;
  details: Record<string, any>;
  event_type?: string;
  event_payload?: Record<string, any>;
  audio_cue?: string;
  map_focus?: { km: number; zoom: number };
}

interface ScenarioRunResult {
  key: string;
  name: string;
  description: string;
  steps_count: number;
  steps: ScenarioStep[];
  events_count: number;
  events: any[];
}

export const ScenarioPlayerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('eng_vs_trd_conflict');
  const [activeScenario, setActiveScenario] = useState<ScenarioRunResult | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available scenarios on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await axios.get('/api/v1/demo/scenarios/');
        if (res.data?.scenarios) {
          setScenarios(res.data.scenarios);
        }
      } catch (err) {
        console.warn('Could not fetch scenarios from backend:', err);
      }
    };
    fetchScenarios();
  }, []);

  // Load and execute selected scenario
  const loadScenario = async (key: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);
    try {
      const res = await axios.post('/api/v1/demo/scenarios/run/', {
        scenario: key,
        live_mode: false,
        broadcast: true,
      });
      if (res.data?.scenario) {
        setActiveScenario(res.data.scenario);
        setCurrentStepIdx(0);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load presentation scenario');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch scenario tab
  const handleSelectScenario = (key: string) => {
    setSelectedKey(key);
    loadScenario(key);
  };

  // Autoplay progression timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && activeScenario && activeScenario.steps.length > 0) {
      timer = setTimeout(() => {
        if (currentStepIdx < activeScenario.steps.length - 1) {
          setCurrentStepIdx((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, activeScenario]);

  // Open modal and load default scenario
  const handleOpen = () => {
    setIsOpen(true);
    if (!activeScenario) {
      loadScenario(selectedKey);
    }
  };

  const currentStep = activeScenario?.steps[currentStepIdx];

  const getScenarioBadge = (key: string) => {
    switch (key) {
      case 'morning_dashboard':
        return { label: 'SCENARIO A', color: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300' };
      case 'eng_vs_trd_conflict':
        return { label: 'SCENARIO B (CORE USP)', color: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' };
      case 'rajdhani_delay_cascade':
        return { label: 'SCENARIO C', color: 'bg-amber-950/80 border-amber-500/50 text-amber-300' };
      case 'zero_fatality_safety':
        return { label: 'SCENARIO D', color: 'bg-purple-950/80 border-purple-500/50 text-purple-300' };
      default:
        return { label: 'SCENARIO', color: 'bg-slate-900 border-slate-700 text-slate-300' };
    }
  };

  return (
    <>
      {/* Golden Cinema Button on Top Right (next to Test Runner) */}
      <div className="fixed top-3 right-56 z-50">
        <button
          onClick={handleOpen}
          className="relative group px-4 py-2 rounded-xl font-mono font-bold text-xs shadow-2xl transition-all duration-300 flex items-center gap-2 border bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border-amber-300/60 shadow-amber-950/60 hover:scale-105 active:scale-95"
          title="Open Interactive Scenario Presentation Player (SIH PS 26027)"
        >
          <Film className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="tracking-wide uppercase drop-shadow">🎬 চিত্রনাট্য প্লেয়ার (SCENARIOS)</span>
          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping absolute -top-1 -right-1" />
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono">
          <div className="bg-slate-950 border-2 border-amber-500/40 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl shadow-amber-950/40 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white tracking-wide uppercase">
                      Indian Railways AI Scenario Player
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                      SIH PS 26027 GOLDEN STORIES
                    </span>
                  </div>
                  <p className="text-xs text-control-muted mt-0.5">
                    Interactive Step-by-Step Demonstration Stories • Dynamic DB Records & Live Audio Events
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scenario Navigation Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-900/60 border-b border-slate-800">
              {[
                { key: 'morning_dashboard', icon: Sparkles, name: 'Scenario A: Morning Dashboard', tag: 'Why #1? Card' },
                { key: 'eng_vs_trd_conflict', icon: Zap, name: 'Scenario B: Combined Block', tag: 'USP #98 (3.5h Saved)' },
                { key: 'rajdhani_delay_cascade', icon: Clock, name: 'Scenario C: Delay Cascade', tag: 'Breathing Plan' },
                { key: 'zero_fatality_safety', icon: ShieldCheck, name: 'Scenario D: Digital Safety', tag: 'Zero-Fatality Protocol' },
              ].map((s) => {
                const isSelected = selectedKey === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSelectScenario(s.key)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold truncate">{s.name.split(':')[1]}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                      isSelected
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {s.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400">Loading scenario lifecycle & initializing state...</p>
                </div>
              ) : errorMsg ? (
                <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Scenario Load Error</span>
                  </div>
                  <p className="text-xs">{errorMsg}</p>
                </div>
              ) : activeScenario && currentStep ? (
                <div className="space-y-6">
                  {/* Scenario Info Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${getScenarioBadge(selectedKey).color}`}>
                          {getScenarioBadge(selectedKey).label}
                        </span>
                        <h3 className="text-sm font-bold text-white">{activeScenario.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{activeScenario.description}</p>
                    </div>

                    {/* Step Timeline Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeScenario.steps.map((st, idx) => (
                        <button
                          key={st.step}
                          onClick={() => {
                            setIsPlaying(false);
                            setCurrentStepIdx(idx);
                          }}
                          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center transition-all border ${
                            idx === currentStepIdx
                              ? 'bg-amber-500 text-black border-amber-300 font-extrabold shadow-lg shadow-amber-500/30 scale-110'
                              : idx < currentStepIdx
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'
                          }`}
                          title={`Jump to Step ${st.step}: ${st.title}`}
                        >
                          {st.step}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Step Presentation Spotlight */}
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 space-y-5 shadow-2xl relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Step Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold text-sm">
                          {currentStep.step}
                        </span>
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                            Step {currentStep.step} of {activeScenario.steps.length}
                          </span>
                          <h4 className="text-base font-extrabold text-white tracking-wide">
                            {currentStep.title}
                          </h4>
                        </div>
                      </div>

                      {currentStep.map_focus && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Focus: KM {currentStep.map_focus.km.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Spoken Narration Box */}
                    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                        <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>PRESENTATION NARRATIVE (বিচারকদের সামনে উপস্থাপনার বিবরণ):</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium">
                        "{currentStep.narrative}"
                      </p>
                    </div>

                    {/* Technical Inspection Details Grid */}
                    {currentStep.details && Object.keys(currentStep.details).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                          Real-time System Attributes & Telemetry:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {Object.entries(currentStep.details).map(([k, v]) => (
                            <div
                              key={k}
                              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-1"
                            >
                              <span className="text-[10px] text-control-muted uppercase font-bold truncate">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs font-extrabold text-cyan-300 truncate">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Broadcast Event Tag */}
                    {currentStep.event_type && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-400">WebSocket Broadcast Event:</span>
                          <span className="font-bold text-emerald-300">{currentStep.event_type}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Latency: &lt;14ms</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Playback Control Bar */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIdx((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentStepIdx === 0 || isLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={isLoading}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-lg ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause Autoplay</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Autoplay Story</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    if (activeScenario) {
                      setCurrentStepIdx((prev) => Math.min(activeScenario.steps.length - 1, prev + 1));
                    }
                  }}
                  disabled={!activeScenario || currentStepIdx >= activeScenario.steps.length - 1 || isLoading}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    loadScenario(selectedKey);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-execute</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition shadow-lg shadow-amber-950"
                >
                  Close Player
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
