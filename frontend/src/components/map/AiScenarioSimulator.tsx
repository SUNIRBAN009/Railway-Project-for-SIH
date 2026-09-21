import React, { useState, useEffect } from 'react';
import { useBlockStore } from '../../stores/blockStore';
import { Block, BlockStatus } from '../../types';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Layers,
  Zap,
  Wrench,
  Radio,
  Train,
  Cpu,
  X,
  Flame,
  ChevronRight,
  TrendingDown,
  Timer,
  Check,
} from 'lucide-react';

export interface SimulationScenario {
  id: string;
  title: string;
  titleBn: string;
  category: 'PASSENGER_CONFLICT' | 'SHADOW_BUNDLING' | 'EMERGENCY_DEFECT';
  description: string;
  descriptionBn: string;
  kmPost: string;
  involvedDepts: ('ENG' | 'TRD' | 'SNT')[];
  incomingProblem: {
    title: string;
    details: string[];
    affectedTrains: string[];
    conflictSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    initialDelayMin: number;
    blocksToInject: Partial<Block>[];
  };
  aiResolution: {
    summary: string;
    summaryBn: string;
    steps: string[];
    delayAfterAi: number;
    capacitySavedHours: number;
    safetyScore: number;
    resolvedBlocks: {
      blockCode: string;
      newStatus: BlockStatus;
      shiftText: string;
      notes: string;
    }[];
  };
}

export const DEMO_SCENARIOS: SimulationScenario[] = [
  {
    id: 'sc-1',
    title: 'High-Density Passenger Train vs P-Way Rail Renewal',
    titleBn: 'উচ্চগতির রাজধানী এক্সপ্রেস বনাম রেলওয়ে ট্র্যাক সংস্কার দ্বন্দ্ব',
    category: 'PASSENGER_CONFLICT',
    description: 'Track Engineering requests a 120-minute possession right as 12424 Dibrugarh Rajdhani approaches on the UP Main Line.',
    descriptionBn: 'আনন্দ বিহার ও সাহিবাবাদের মাঝে ট্র্যাক ইঞ্জিনিয়ারিং ১২০ মিনিটের ব্লক চেয়েছে, কিন্তু সেই সময়ই ডিব্রুগড় রাজধানী এক্সপ্রেস আসছে।',
    kmPost: 'KM 12.0 – 15.0 (UP Main)',
    involvedDepts: ['ENG'],
    incomingProblem: {
      title: 'Headway Collision Risk: Train 12424 (130 km/h) inside Requested Possession Span',
      details: [
        'ENG proposed block BLK-ENG-901 at KM 12.0–15.0 between 16:30 and 18:30 hrs.',
        '12424 Dibrugarh Rajdhani scheduled to traverse Anand Vihar at 16:45 hrs.',
        'Immediate risk of 65 minutes passenger delay or complete corridor blockade.',
        'Spatio-temporal collision probability: 98.6%.',
      ],
      affectedTrains: ['12424 Dibrugarh Rajdhani Express', '12004 Lucknow Shatabdi Express'],
      conflictSeverity: 'CRITICAL',
      initialDelayMin: 65,
      blocksToInject: [
        {
          id: 'sim-eng-901',
          block_code: 'BLK-ENG-901',
          department_code: 'ENG',
          work_type: 'Deep Ballast Screening & Rail Renewal',
          line_type: 'UP',
          start_km: 12.0,
          end_km: 15.0,
          status: 'CONFLICT_DETECTED' as BlockStatus,
          equipment_required: 'BCM Machine #08 + 12 Hopper Rakes',
          work_description: '[SIMULATED CONFLICT] Urgent 120-min track renewal. Direct clash with Train 12424 path.',
        },
      ],
    },
    aiResolution: {
      summary: 'Sweep-Line Dynamic Temporal Shift & Platform Crossover Divert',
      summaryBn: 'এআই সুইপ-লাইন ইঞ্জিন: ব্লক ২৫ মিনিট পিছিয়ে দিল এবং শতাব্দী এক্সপ্রেসকে লুপ লাইন দিয়ে পাস করালো।',
      steps: [
        'Sweep-Line algorithm identified 28-minute natural timetable gap post-Rajdhani clearance.',
        'AI shifted BLK-ENG-901 start time by +25 minutes (New Window: 16:55 – 18:55 hrs).',
        'Diverted trailing Train 12004 (Shatabdi) via Anand Vihar crossover #12B to clear the work zone.',
        'Calculated zero passenger detention with 100% track safety clearance.',
      ],
      delayAfterAi: 0,
      capacitySavedHours: 1.8,
      safetyScore: 100,
      resolvedBlocks: [
        {
          blockCode: 'BLK-ENG-901',
          newStatus: 'COORDINATED',
          shiftText: '+25 min temporal shift (Cleared Rajdhani)',
          notes: 'AI Deconflicted: Time window synchronized post-12424 departure. Crossover #12B locked.',
        },
      ],
    },
  },
  {
    id: 'sc-2',
    title: 'Triple Department Coordinated Shadow Bundling',
    titleBn: '৩টি বিভাগের যৌথ শ্যাডো বান্ডলিং (ENG + TRD + SNT)',
    category: 'SHADOW_BUNDLING',
    description: 'Track, OHE Power, and Signaling departments request independent blocks at Sahibabad. AI merges them into a single window.',
    descriptionBn: 'সাহিবাবাদে ৩টি বিভাগ আলাদা আলাদা ব্লক চেয়েছিল (মোট ৬.৫ ঘণ্টা)। এআই সেগুলোকে একত্রিত করে মাত্র ১১০ মিনিটে সমাধান করল।',
    kmPost: 'KM 14.5 – 18.0 (UP & DOWN)',
    involvedDepts: ['ENG', 'TRD', 'SNT'],
    incomingProblem: {
      title: 'Corridor Over-Fragmentation: 3 Uncoordinated Requests across 6.5 Hours',
      details: [
        'TRD requested OHE Power Cut at KM 14.5–18.0 (120 mins).',
        'ENG requested Track Tamping at KM 15.0–17.5 (150 mins).',
        'SNT requested Axle Counter & Point Machine Replacement at KM 16.2 (90 mins).',
        'If executed separately, corridor throughput drops by 62% with cascading delays across North India.',
      ],
      affectedTrains: ['12260 Sealdah Duronto', '12560 Shiv Ganga SF', 'FRT-BCN-88 Coal Freight'],
      conflictSeverity: 'HIGH',
      initialDelayMin: 140,
      blocksToInject: [
        {
          id: 'sim-trd-801',
          block_code: 'BLK-TRD-801',
          department_code: 'TRD',
          work_type: '25kV Catenary Wire Stringing',
          line_type: 'UP',
          start_km: 14.5,
          end_km: 18.0,
          status: 'PENDING_APPROVAL' as BlockStatus,
          equipment_required: 'OHE Tower Wagon TW-22',
          work_description: '[SIMULATED] 25kV traction power isolation required.',
        },
        {
          id: 'sim-eng-802',
          block_code: 'BLK-ENG-802',
          department_code: 'ENG',
          work_type: 'Continuous Tamping (CSM-09)',
          line_type: 'UP',
          start_km: 15.0,
          end_km: 17.5,
          status: 'PENDING_APPROVAL' as BlockStatus,
          equipment_required: 'CSM Tamping Machine + DGS',
          work_description: '[SIMULATED] 150-min tamping required beneath de-energized line.',
        },
        {
          id: 'sim-snt-803',
          block_code: 'BLK-SNT-803',
          department_code: 'SNT',
          work_type: 'Solid State Interlocking (SSI) Point Overhaul',
          line_type: 'UP',
          start_km: 16.0,
          end_km: 16.8,
          status: 'PENDING_APPROVAL' as BlockStatus,
          equipment_required: 'Signal Testing Console',
          work_description: '[SIMULATED] Axle counter sensor recalibration at SBB yard.',
        },
      ],
    },
    aiResolution: {
      summary: 'Automated Multi-Department Shadow Bundling Matrix (110 Min Window)',
      summaryBn: 'এআই শ্যাডো বান্ডলিং: ৩টি কাজকে এক সাথে সাজিয়ে ৪ ঘণ্টা ১০ মিনিট লাইন বন্ধের সময় বাঁচিয়ে দিল!',
      steps: [
        'Detected spatial colocation overlap across KM 15.0 – 17.5.',
        'Sequenced machinery entry: TRD de-energizes 25kV line (0-15m) → ENG tamps under dead catenary (15-95m) → SNT performs sensor calibration concurrently (20-90m) → TRD re-energizes & tests (95-110m).',
        'Merged 3 separate possessions into ONE synchronized 110-minute master slot.',
        'Saved 4 hours 10 minutes of corridor blockage; 0 freight rakes cancelled.',
      ],
      delayAfterAi: 0,
      capacitySavedHours: 4.2,
      safetyScore: 99.4,
      resolvedBlocks: [
        {
          blockCode: 'BLK-TRD-801',
          newStatus: 'COORDINATED',
          shiftText: 'Bundled into Master Slot (T=0m to T=110m)',
          notes: 'Master Power Isolation authorized. Re-energization protocol synchronized.',
        },
        {
          blockCode: 'BLK-ENG-802',
          newStatus: 'COORDINATED',
          shiftText: 'Shadow Bundled under TRD Power Window',
          notes: 'CSM machine authorized to work concurrently with OHE de-energization.',
        },
        {
          blockCode: 'BLK-SNT-803',
          newStatus: 'COORDINATED',
          shiftText: 'Parallel SSI Execution at KM 16.2',
          notes: 'Point machine recalibration synchronized without additional track closure.',
        },
      ],
    },
  },
  {
    id: 'sc-3',
    title: 'Emergency USFD Rail Flaw Detection & Rapid Recovery',
    titleBn: 'জরুরি আল্ট্রাসনিক রেলওয়ে ক্র্যাক শনাক্তকরণ ও তাৎক্ষণিক সমাধান',
    category: 'EMERGENCY_DEFECT',
    description: 'Track Ultrasonic testing flags a severe flaw at KM 14.8. AI dynamically generates an emergency speed restriction and a 45-min repair slot.',
    descriptionBn: '১৪.৮ কিমিতে ফাটল ধরা পড়ায় গতিবেগ ২০ কিমি/ঘণ্টা হয়ে ট্রেন আটকে যাচ্ছিল। এআই গতিপথ পরিবর্তন করে জরুরি মেরামত স্লট তৈরি করে দিল।',
    kmPost: 'KM 14.8 (Sahibabad – Ghaziabad)',
    involvedDepts: ['ENG', 'SNT'],
    incomingProblem: {
      title: 'Immediate Safety Hazard: Critical Internal Rail Flaw at KM 14.8',
      details: [
        'USFD detector car registered 85% transverse rail fracture depth.',
        'Speed automatically restricted from 130 km/h to 20 km/h (PSR-20).',
        'Heavy congestion building up behind Tilak Bridge and Anand Vihar.',
        'High risk of rail break under heavy freight haulage.',
      ],
      affectedTrains: ['22436 Vande Bharat', '12302 Howrah Rajdhani', 'CON-DL-09 DFC Freight'],
      conflictSeverity: 'CRITICAL',
      initialDelayMin: 85,
      blocksToInject: [
        {
          id: 'sim-flaw-777',
          block_code: 'EMG-USFD-777',
          department_code: 'ENG',
          work_type: 'Emergency Thermite Welding & Rail Cut',
          line_type: 'UP',
          start_km: 14.6,
          end_km: 15.0,
          status: 'CONFLICT_DETECTED' as BlockStatus,
          equipment_required: 'Flash Butt / Thermite Weld Unit + Ultrasonic Gauge',
          work_description: '[EMERGENCY FLAW] Immediate weld repair required at KM 14.8.',
        },
      ],
    },
    aiResolution: {
      summary: 'Dynamic Traffic Throttling + 45-Min Emergency Surgical Slot',
      summaryBn: 'এআই সমাধান: ট্রাফিক নিয়ন্ত্রণের মাঝে ৪৫ মিনিটের ইমার্জেন্সি স্লট বের করে গতিবেগ পুনরায় ১৩০ কিমি করা হলো।',
      steps: [
        'AI detected low-density gap between Vande Bharat (KM 38) and Howrah Rajdhani (KM 24).',
        'Carved out a 45-minute surgical emergency possession window (17:15 – 18:00 hrs).',
        'Dispatched P-Way Emergency Gang #04 with automated track trolley.',
        'Restored track speed to full 130 km/h immediately post ultrasonic verification.',
      ],
      delayAfterAi: 4,
      capacitySavedHours: 2.5,
      safetyScore: 100,
      resolvedBlocks: [
        {
          blockCode: 'EMG-USFD-777',
          newStatus: 'SANCTIONED',
          shiftText: 'Emergency Fast-Track Sanction Granted',
          notes: 'Chief Operating Controller emergency sanction granted. Line speed restored to 130 km/h.',
        },
      ],
    },
  },
];

interface AiScenarioSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenarioToMap?: (scenario: SimulationScenario) => void;
}

export const AiScenarioSimulator: React.FC<AiScenarioSimulatorProps> = ({
  isOpen,
  onClose,
  onSelectScenarioToMap,
}) => {
  const { blocks, submitBlockProposal } = useBlockStore();

  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(DEMO_SCENARIOS[0]);
  const [currentStep, setCurrentStep] = useState<'IDLE' | 'PROBLEM' | 'AI_THINKING' | 'SOLUTION' | 'APPLIED'>('IDLE');
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Reset step whenever scenario changes
  const handleSelectScenario = (sc: SimulationScenario) => {
    setSelectedScenario(sc);
    setCurrentStep('IDLE');
    setThinkingProgress(0);
    setIsAutoPlaying(false);
  };

  // Step 1: Inject problem
  const handleInjectProblem = () => {
    setCurrentStep('PROBLEM');
    // Inject problem blocks into the live store
    const { blocksToInject } = selectedScenario.incomingProblem;
    blocksToInject.forEach((pb) => {
      submitBlockProposal(pb, 'AI Simulation Engine');
    });
  };

  // Step 2: Trigger AI
  const handleTriggerAi = () => {
    setCurrentStep('AI_THINKING');
    setThinkingProgress(15);
  };

  useEffect(() => {
    let timer: any;
    if (currentStep === 'AI_THINKING') {
      const interval = setInterval(() => {
        setThinkingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setCurrentStep('SOLUTION');
            return 100;
          }
          return prev + 18;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Step 3: Apply Solution
  const handleApplySolution = () => {
    // Update the injected blocks in the store to COORDINATED or SANCTIONED
    const { resolvedBlocks } = selectedScenario.aiResolution;
    const currentBlocks = useBlockStore.getState().blocks;

    const updated = currentBlocks.map((b) => {
      const match = resolvedBlocks.find((rb) => rb.blockCode === b.block_code);
      if (match) {
        return {
          ...b,
          status: match.newStatus,
          work_description: `${b.work_description} [AI RESOLUTION APPLIED: ${match.notes}]`,
        };
      }
      return b;
    });

    useBlockStore.setState({ blocks: updated });
    try {
      localStorage.setItem('railway_blocks_v1', JSON.stringify(updated));
    } catch {}

    setCurrentStep('APPLIED');
    if (onSelectScenarioToMap) {
      onSelectScenarioToMap(selectedScenario);
    }
  };

  // Auto-Play Feature: plays the entire flow step-by-step automatically
  const handleAutoPlay = () => {
    setIsAutoPlaying(true);
    handleInjectProblem();
    setTimeout(() => {
      handleTriggerAi();
      setTimeout(() => {
        handleApplySolution();
        setIsAutoPlaying(false);
      }, 2200);
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900/95 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden font-mono text-xs">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-control-border bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-md">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <h2 className="text-base sm:text-lg font-extrabold text-white font-mono tracking-tight">
                  AI Sweep-Line & Shadow Bundling • Simulation Suite
                </h2>
              </div>
              <p className="text-[11px] text-cyan-400 font-sans">
                লাইভ এআই কনফ্লিক্ট শনাক্তকরণ ও সমাধান সিমুলেটর • Real-Life Railway Incident Resolver
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoPlay}
              disabled={isAutoPlaying}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isAutoPlaying ? 'Running Simulation...' : '▶ এক ক্লিকে সম্পূর্ণ ডেমো চালান'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-control-muted hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Scenario Picker Carousel */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-control-muted uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select Conflict Scenario (সমস্যা নির্বাচন করুন):</span>
              </span>
              <span className="text-[10px] text-slate-400">3 Real-Life Incident Scenarios</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DEMO_SCENARIOS.map((sc) => {
                const isSelected = selectedScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/60'
                        : 'bg-control-panel border-control-border hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          sc.category === 'PASSENGER_CONFLICT'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                            : sc.category === 'SHADOW_BUNDLING'
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/50'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                        }`}>
                          {sc.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-control-muted">{sc.kmPost}</span>
                      </div>
                      <h4 className="font-bold text-white text-xs leading-tight mb-1">{sc.title}</h4>
                      <p className="text-[11px] text-cyan-400 font-sans line-clamp-2">{sc.titleBn}</p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800 text-[10px]">
                      <span className="text-control-muted">Departments:</span>
                      {sc.involvedDepts.map((d) => (
                        <span key={d} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                          {d}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-control-border flex items-center justify-between gap-2 overflow-x-auto text-[11px]">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
              currentStep === 'IDLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400' : 'text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">1</span>
              <span>প্রস্তুতি (Idle)</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
              currentStep === 'PROBLEM' ? 'bg-rose-500/20 text-rose-300 border border-rose-500 animate-pulse' : 'text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-rose-950 flex items-center justify-center font-bold text-xs text-rose-400">2</span>
              <span>সমস্যা তৈরি (Conflict Injected)</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
              currentStep === 'AI_THINKING' ? 'bg-purple-500/20 text-purple-300 border border-purple-400 animate-pulse' : 'text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-purple-950 flex items-center justify-center font-bold text-xs text-purple-400">3</span>
              <span>এআই প্রসেসিং (AI Optimization)</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
              currentStep === 'SOLUTION' || currentStep === 'APPLIED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400' : 'text-slate-400'
            }`}>
              <span className="w-5 h-5 rounded-full bg-emerald-950 flex items-center justify-center font-bold text-xs text-emerald-400">4</span>
              <span>ম্যাপে প্রয়োগ (Applied to Twin)</span>
            </div>
          </div>

          {/* Interactive Simulation Console Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Card: The Incoming Conflict Problem */}
            <div className={`rounded-2xl border p-4 space-y-3 transition ${
              currentStep === 'PROBLEM'
                ? 'bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500'
                : 'bg-control-panel border-control-border'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 ${currentStep === 'PROBLEM' ? 'text-rose-400 animate-bounce' : 'text-amber-400'}`} />
                  <span className="font-bold text-white text-xs">ধাপ ১: তৈরি হওয়া সংকট (The Conflict)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40">
                  {selectedScenario.incomingProblem.conflictSeverity} SEVERITY
                </span>
              </div>

              <div>
                <h3 className="text-white font-bold text-sm leading-snug">
                  {selectedScenario.incomingProblem.title}
                </h3>
                <p className="text-slate-300 text-[11px] font-sans mt-1">
                  {selectedScenario.descriptionBn}
                </p>
              </div>

              {/* Conflict Specs */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-slate-800 text-[11px]">
                {selectedScenario.incomingProblem.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <span className="text-rose-400 font-bold shrink-0">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              {/* Affected Trains & Impact */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-control-muted uppercase">Potential Passenger Delay</span>
                  <p className="text-rose-400 font-extrabold text-sm mt-0.5">
                    +{selectedScenario.incomingProblem.initialDelayMin} Minutes
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-control-muted uppercase">Impacted Trains</span>
                  <p className="text-white font-bold truncate mt-0.5">
                    {selectedScenario.incomingProblem.affectedTrains[0]}
                  </p>
                </div>
              </div>

              {/* Action Button for Step 1 */}
              <div className="pt-2">
                <button
                  onClick={handleInjectProblem}
                  disabled={currentStep !== 'IDLE'}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                    currentStep === 'IDLE'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{currentStep === 'IDLE' ? '১. এই সমস্যাটি তৈরি করুন ও ম্যাপে পাঠান' : 'সমস্যা ম্যাপে পাঠানো হয়েছে ✓'}</span>
                </button>
              </div>
            </div>

            {/* Right Card: AI Sweep-Line Engine & Solution */}
            <div className={`rounded-2xl border p-4 space-y-3 transition ${
              currentStep === 'SOLUTION' || currentStep === 'APPLIED'
                ? 'bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500'
                : 'bg-control-panel border-control-border'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-xs">ধাপ ২: এআই বিশ্লেষণ ও সমাধান (AI Engine)</span>
                </div>
                {currentStep === 'SOLUTION' || currentStep === 'APPLIED' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    SOLVED
                  </span>
                ) : (
                  <span className="text-[10px] text-control-muted font-sans">অপেক্ষমান...</span>
                )}
              </div>

              {/* AI Thinking Animation */}
              {currentStep === 'AI_THINKING' && (
                <div className="p-6 text-center space-y-3 bg-black/40 rounded-xl border border-purple-500/40">
                  <div className="flex items-center justify-center gap-2 text-purple-300 font-bold">
                    <Cpu className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>AI Sweep-Line & Shadow Bundling Running...</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${thinkingProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    করিডোরের ট্রেনের গতিবেগ, ট্রানজিট পয়েন্ট ও ডিপার্টমেন্ট ব্লক ক্যালকুলেট করা হচ্ছে...
                  </p>
                </div>
              )}

              {/* AI Solution Content */}
              {(currentStep === 'SOLUTION' || currentStep === 'APPLIED') && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-purple-300 font-bold text-sm leading-snug">
                      {selectedScenario.aiResolution.summary}
                    </h3>
                    <p className="text-white text-[11px] font-sans mt-1">
                      {selectedScenario.aiResolution.summaryBn}
                    </p>
                  </div>

                  {/* AI Step-by-Step Execution Plan */}
                  <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-slate-800 text-[11px]">
                    {selectedScenario.aiResolution.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-200">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* Resolution KPIs (Before vs After) */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                    <div className="p-2 rounded-xl bg-slate-950 border border-emerald-500/30">
                      <span className="text-control-muted uppercase">Train Delay</span>
                      <p className="text-emerald-400 font-extrabold text-sm mt-0.5">
                        {selectedScenario.aiResolution.delayAfterAi} Min
                      </p>
                      <span className="text-[9px] text-emerald-500 font-bold">100% On-Time</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-purple-500/30">
                      <span className="text-control-muted uppercase">Downtime Saved</span>
                      <p className="text-purple-300 font-extrabold text-sm mt-0.5">
                        {selectedScenario.aiResolution.capacitySavedHours} Hours
                      </p>
                      <span className="text-[9px] text-purple-400 font-bold">Shadow Bundled</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30">
                      <span className="text-control-muted uppercase">Safety Index</span>
                      <p className="text-cyan-300 font-extrabold text-sm mt-0.5">
                        {selectedScenario.aiResolution.safetyScore}%
                      </p>
                      <span className="text-[9px] text-cyan-400 font-bold">G&SR Compliant</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting placeholder if idle */}
              {currentStep !== 'AI_THINKING' && currentStep !== 'SOLUTION' && currentStep !== 'APPLIED' && (
                <div className="p-8 text-center text-control-muted border border-dashed border-slate-800 rounded-xl">
                  <Cpu className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                  <p>প্রথমে বাম পাশের বোতামে ক্লিক করে সমস্যা তৈরি করুন। তারপর এআই সমাধান চালু হবে।</p>
                </div>
              )}

              {/* Action Buttons for Step 2 & 3 */}
              <div className="pt-2 flex gap-2">
                {currentStep === 'PROBLEM' && (
                  <button
                    onClick={handleTriggerAi}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>২. AI ইঞ্জিনকে এই সংকট সমাধান করতে বলুন</span>
                  </button>
                )}

                {currentStep === 'SOLUTION' && (
                  <button
                    onClick={handleApplySolution}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition animate-pulse"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>৩. ম্যাপে সমাধানটি প্রয়োগ করুন ও লাইভ দেখুন</span>
                  </button>
                )}

                {currentStep === 'APPLIED' && (
                  <div className="w-full py-2 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ম্যাপে সফলভাবে প্রয়োগ করা হয়েছে! ম্যাপটি পর্যবেক্ষণ করুন।</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-control-muted px-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI SWEEP-LINE ALGORITHM • O(N log N) HEURISTIC SEARCH</span>
          </div>

          <button
            onClick={() => {
              setCurrentStep('IDLE');
              setThinkingProgress(0);
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo (রিসেট)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
