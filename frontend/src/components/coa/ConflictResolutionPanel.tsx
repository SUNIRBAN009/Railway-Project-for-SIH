import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ConflictItem, Block } from '../../types';
import { useBlockStore } from '../../stores/blockStore';
import { playPendingProposalChime } from '../../services/soundService';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Zap,
  Layers,
  RefreshCw,
  ShieldCheck,
  Radio,
  Wrench,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Filter,
  Archive,
  Info,
  ArrowRight,
  ShieldAlert,
  Train,
  ExternalLink,
  Check,
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

export type ConflictCategory =
  | 'TRAIN_PATH_COLLISION'
  | 'PARALLEL_BLOCK_COLLISION'
  | 'OHE_POWER_CONCURRENT_LOCK'
  | 'SHADOW_OPPORTUNITY';

export interface ConflictSolution {
  id: string;
  type: 'TIME_SHIFT' | 'REROUTE' | 'SHADOW_BUNDLE' | 'CAUTION_ORDER' | 'POWER_ISOLATION_PERMIT';
  title: string;
  description: string;
  shiftMinutes?: number;
  badge: string;
  actionText: string;
  isRecommended?: boolean;
}

export interface DynamicConflict {
  id: string;
  blockId: string;
  blockCode: string;
  departmentCode: 'ENG' | 'TRD' | 'SNT';
  category: ConflictCategory;
  categoryLabel: string;
  title: string;
  description: string;
  startKm: number;
  endKm: number;
  lineType: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'OPPORTUNITY';
  conflictingEntity: string;
  solutions: ConflictSolution[];
  isShadow: boolean;
  status: 'PENDING' | 'RESOLVED';
  resolvedSolutionTitle?: string;
  timestamp: string;
}

type DepartmentFilter = 'ALL' | 'ENG' | 'TRD' | 'SNT';
type CategoryFilter = 'ALL' | ConflictCategory;

const TRAIN_PATHS = [
  { number: '12424', name: 'Dibrugarh Rajdhani Express', startKm: 13.8, endKm: 16.5, speedKmh: 130, timeSlot: '02:15–02:40' },
  { number: '12004', name: 'Lucknow Swarna Shatabdi Express', startKm: 17.5, endKm: 22.0, speedKmh: 130, timeSlot: '10:15–10:45' },
  { number: '12056', name: 'Dehradun Jan Shatabdi Express', startKm: 22.0, endKm: 26.5, speedKmh: 110, timeSlot: '05:20–05:50' },
  { number: 'BOXN-881', name: 'Dedicated Freight Corridor BOXN Heavy Consist', startKm: 10.5, endKm: 14.2, speedKmh: 75, timeSlot: '03:10–04:00' },
];

// Continuous Stream Dataset: Ingests realistic departmental proposals & corridor events
const CORRIDOR_STREAM_QUEUE = [
  {
    blockCode: 'BLK-TRD-OHE-801',
    department: 'TRD' as const,
    workType: '25kV Catenary Periodic Inspection & Dropper Retensioning',
    startKm: 14.5,
    endKm: 18.0,
    lineType: 'UP' as const,
    tractionPower: true,
    equipment: 'TW-22 8-Wheeler Tower Wagon',
    gang: 'GANG-TRD-DELHI',
    description: '25kV catenary inspection and contact wire stagger measurement under power cutoff.',
    summary: 'TRD formulated 25kV OHE Catenary Inspection at KM 14.5–18.0',
  },
  {
    blockCode: 'BLK-ENG-CSM-802',
    department: 'ENG' as const,
    workType: 'Track Tamping (CSM-09 Continuous Action Tamper)',
    startKm: 15.0,
    endKm: 17.5,
    lineType: 'UP' as const,
    tractionPower: false,
    equipment: 'CSM-09 Continuous Tamper + DGS',
    gang: 'GANG-ENG-GZB',
    description: 'Continuous track tamping and ballast compaction. Spatial co-location with TRD at KM 15.0-17.5.',
    summary: 'ENG proposed Track Tamping (CSM) at KM 15.0–17.5 • Shadow candidate with TRD',
  },
  {
    blockCode: 'BLK-SNT-SIG-803',
    department: 'SNT' as const,
    workType: 'Point Machine 104 Overhaul & Electronic Interlocking Check',
    startKm: 16.0,
    endKm: 16.8,
    lineType: 'UP' as const,
    tractionPower: false,
    equipment: 'Signal Testing Console',
    gang: 'GANG-SNT-NDLS',
    description: 'Point machine 104A/B detection switch overhaul & axle counter recalibration at Sahibabad.',
    summary: 'S&T submitted Point Machine & Interlocking Overhaul at KM 16.0–16.8',
  },
  {
    blockCode: 'BLK-ENG-USFD-804',
    department: 'ENG' as const,
    workType: 'Emergency USFD Rail Flaw Rectification & Clamping',
    startKm: 19.2,
    endKm: 19.6,
    lineType: 'UP' as const,
    tractionPower: false,
    equipment: 'Hydraulic Rail Tensor & Joggled Fishplate',
    gang: 'GANG-ENG-EMG',
    description: 'Automated ultrasound car acoustic flaw echo at KM 19.4. Urgent clamping & repair required.',
    summary: 'Acoustic ultrasound car flagged internal rail flaw echo at KM 19.4',
  },
  {
    blockCode: 'BLK-TRD-ISO-805',
    department: 'TRD' as const,
    workType: 'Neutral Section Insulator Renewal',
    startKm: 42.0,
    endKm: 44.5,
    lineType: 'UP' as const,
    tractionPower: true,
    equipment: 'Tower Wagon TW-108',
    gang: 'GANG-TRD-ALJN',
    description: 'Neutral section ceramic insulator replacement at Aligarh junction feeding post.',
    summary: 'TRD requested Neutral Section Insulator Renewal at KM 42.0–44.5',
  },
  {
    blockCode: 'BLK-ENG-BCM-806',
    department: 'ENG' as const,
    workType: 'Ballast Cleaning Machine (BCM) Shoulder Screening',
    startKm: 28.0,
    endKm: 31.5,
    lineType: 'DOWN' as const,
    tractionPower: true,
    equipment: 'BCM-201 Machine + MFS Hoppers',
    gang: 'GANG-ENG-MAIN',
    description: 'Deep shoulder ballast screening on DOWN main track with 30 km/h temporary speed restriction.',
    summary: 'ENG proposed Ballast Cleaning Machine screening at KM 28.0–31.5',
  },
];

const STORAGE_RESOLVED_CONFLICTS_KEY = 'railway_resolved_conflicts_v4';

const getStoredResolvedIds = (): string[] => {
  try {
    const cached = localStorage.getItem(STORAGE_RESOLVED_CONFLICTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

interface ConflictResolutionPanelProps {
  block?: Block | null;
  selectedBlock?: Block | null;
  blocks?: Block[];
  onSelectBlock?: (block: Block) => void;
  onApplyResolution?: (conflictId: string, shiftMinutes: number) => void;
  onRefresh?: () => void;
}

export const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  block,
  selectedBlock,
  blocks: propBlocks,
  onSelectBlock,
  onApplyResolution,
  onRefresh,
}) => {
  const { blocks: storeBlocks, sanctionBlock, submitBlockProposal } = useBlockStore();
  const allCorridorBlocks = propBlocks && propBlocks.length > 0 ? propBlocks : storeBlocks;

  const [resolvedIds, setResolvedIds] = useState<string[]>(getStoredResolvedIds);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [deptFilter, setDeptFilter] = useState<DepartmentFilter>('ALL');
  const [catFilter, setCatFilter] = useState<CategoryFilter>('ALL');
  const [isSweeping, setIsSweeping] = useState(false);
  const [lastSweepTime, setLastSweepTime] = useState<Date>(new Date());
  const [successToast, setSuccessToast] = useState<{ message: string; sub: string } | null>(null);

  // Dynamic Ingestion Stream State (Default PAUSED so requests do not flood uncontrollably)
  const [streamIndex, setStreamIndex] = useState(0);
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [streamFeedNotice, setStreamFeedNotice] = useState<string | null>(null);

  const handleResetCorridorBaseline = useCallback(() => {
    setIsAutoStreaming(false);
    setStreamIndex(0);
    try {
      localStorage.removeItem('railway_blocks_v1');
      localStorage.removeItem('railway_local_blocks_v4');
      localStorage.removeItem('railway_last_ack_v1');
      localStorage.removeItem(STORAGE_RESOLVED_CONFLICTS_KEY);
    } catch {}
    window.location.reload();
  }, []);

  const markConflictResolved = useCallback((conflictId: string) => {
    setResolvedIds((prev) => {
      const next = prev.includes(conflictId) ? prev : [...prev, conflictId];
      try {
        localStorage.setItem(STORAGE_RESOLVED_CONFLICTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Function to inject next corridor event into store & corridor feed
  const injectNextStreamEvent = useCallback(async () => {
    if (streamIndex >= CORRIDOR_STREAM_QUEUE.length) {
      setStreamFeedNotice('All 6 stream events ingested. Resuming dynamic sweep loop.');
      setStreamIndex(0);
      return;
    }

    const evt = CORRIDOR_STREAM_QUEUE[streamIndex];
    setStreamIndex((prev) => prev + 1);

    const now = Date.now();
    const newProposal: Partial<Block> = {
      id: `blk-stream-${evt.blockCode.toLowerCase()}`,
      block_code: evt.blockCode,
      department_code: evt.department,
      work_type: evt.workType,
      start_km: evt.startKm,
      end_km: evt.endKm,
      line_type: evt.lineType,
      status: 'SUBMITTED',
      scheduled_start_time: new Date(now + 40 * 60 * 1000).toISOString(),
      scheduled_end_time: new Date(now + 160 * 60 * 1000).toISOString(),
      traction_power_cutoff_required: evt.tractionPower,
      gang_id: evt.gang,
      equipment_required: evt.equipment,
      work_description: evt.description,
      version: 1,
    };

    // Inject into local store and trigger corridor synchronization
    await submitBlockProposal(newProposal as any, `${evt.department} Section Controller`);

    setStreamFeedNotice(`[CORRIDOR STREAM INGESTED]: ${evt.summary}`);
    setTimeout(() => {
      setStreamFeedNotice(null);
    }, 6500);

    if (onRefresh) {
      setTimeout(() => onRefresh(), 300);
    }
  }, [streamIndex, submitBlockProposal, onRefresh]);

  // Automated Ingestion Loop: runs randomly at 5, 8, or 10 minutes when isAutoStreaming is true
  useEffect(() => {
    if (!isAutoStreaming) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const intervals = [5 * 60 * 1000, 8 * 60 * 1000, 10 * 60 * 1000]; // 5, 8, or 10 mins
      const nextDelay = intervals[Math.floor(Math.random() * intervals.length)];
      
      timeoutId = setTimeout(() => {
        injectNextStreamEvent();
        scheduleNext();
      }, nextDelay);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [isAutoStreaming, injectNextStreamEvent]);

  const handleManualSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
      setLastSweepTime(new Date());
      if (onRefresh) onRefresh();
    }, 600);
  };

  // Continuous Dynamic AI Sweep-Line Multi-Domain Evaluation
  const allConflicts = useMemo<DynamicConflict[]>(() => {
    const list: DynamicConflict[] = [];

    // Filter candidate blocks: pending, proposed, submitted, or conflict-detected blocks
    const candidateBlocks = allCorridorBlocks.filter((b) =>
      ['SUBMITTED', 'COORDINATED', 'PENDING_APPROVAL', 'CONFLICT_DETECTED', 'PROPOSED', 'DRAFT'].includes(b.status)
    );

    const evalBlocks = candidateBlocks.length > 0 ? candidateBlocks : allCorridorBlocks;

    // 1. EVALUATE EACH BLOCK ACROSS 3 DEPARTMENTS (ENG, TRD, SNT)
    evalBlocks.forEach((b1) => {
      const b1Start = Number(b1.start_km) || 0;
      const b1End = Number(b1.end_km) || 0;
      const b1Span = `${b1Start.toFixed(1)}–${b1End.toFixed(1)}`;
      const dept = (b1.department_code || 'ENG') as 'ENG' | 'TRD' | 'SNT';

      // =========================================================================
      // CATEGORY 1: TRAIN PATH TIMETABLE COLLISION (Train Schedule Intersections)
      // =========================================================================
      const collidingTrain = TRAIN_PATHS.find(
        (tp) => !(b1End < tp.startKm || b1Start > tp.endKm)
      ) || {
        number: `${12000 + (Math.abs(Math.round(b1Start * 19)) % 450)}`,
        name: dept === 'TRD' ? 'Dedicated Freight Corridor BOXN Consist' : 'Northern Railway Intercity Superfast',
        startKm: Math.max(0, b1Start - 1.2),
        endKm: b1End + 1.5,
        speedKmh: 110,
        timeSlot: `${new Date(b1.scheduled_start_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };

      const cnfId = `cnf-${b1.id}-train-${collidingTrain.number}`;
      const isRes = resolvedIds.includes(cnfId) || b1.status === 'COORDINATED';

      const solutions: ConflictSolution[] = [
        {
          id: `sol-${cnfId}-shift`,
          type: 'TIME_SHIFT',
          title: `Shift Start Slot (+30m)`,
          description: `Shift possession start by +30 minutes to permit train #${collidingTrain.number} uninterrupted clearance through KM ${b1Span}.`,
          shiftMinutes: 30,
          badge: 'RECOMMENDED • TIME SHIFT',
          actionText: 'Apply +30m Shift & Clear',
          isRecommended: true,
        },
        {
          id: `sol-${cnfId}-reroute`,
          type: 'REROUTE',
          title: `Divert via Loop Line 2 (Platform 3)`,
          description: `Reroute train #${collidingTrain.number} through adjacent loop line at 30 km/h PSR. Maintenance work can proceed concurrently.`,
          badge: 'TRAFFIC DIVERSION',
          actionText: 'Enforce Loop Line Diversion',
        },
        {
          id: `sol-${cnfId}-caution`,
          type: 'CAUTION_ORDER',
          title: `Impose 45 km/h Caution Order on Adjacent Line`,
          description: `Sanction speed restriction of 45 km/h on UP/DN line without altering maintenance possession start time.`,
          badge: 'SPEED RESTRICTION',
          actionText: 'Issue 45 km/h Caution Order',
        },
      ];

      list.push({
        id: cnfId,
        blockId: b1.id,
        blockCode: b1.block_code,
        departmentCode: dept,
        category: 'TRAIN_PATH_COLLISION',
        categoryLabel: 'Train Timetable Path Collision',
        title: `Priority Train Path Intersect (${collidingTrain.number} ${collidingTrain.name})`,
        description: `Proposed ${dept} maintenance possession at KM ${b1Span} clashes with high-speed slot of ${collidingTrain.name} (${collidingTrain.speedKmh} km/h). Headway separation compromised.`,
        startKm: b1Start,
        endKm: b1End,
        lineType: b1.line_type || 'UP',
        severity: collidingTrain.speedKmh >= 130 ? 'CRITICAL' : 'MAJOR',
        conflictingEntity: `Train #${collidingTrain.number} (${collidingTrain.name})`,
        solutions,
        isShadow: false,
        status: isRes ? 'RESOLVED' : 'PENDING',
        timestamp: 'Live Corridor Sweep',
      });

      // =========================================================================
      // CATEGORY 3: 25kV TRACTION & OHE POWER CUTZONE ISOLATION LOCK
      // =========================================================================
      if (b1.traction_power_cutoff_required || dept === 'TRD' || (b1.work_type && b1.work_type.toLowerCase().includes('ohe'))) {
        const oheCnfId = `cnf-${b1.id}-ohe-isolation`;
        const isOheRes = resolvedIds.includes(oheCnfId) || b1.status === 'COORDINATED';

        const oheSolutions: ConflictSolution[] = [
          {
            id: `sol-${oheCnfId}-ptw`,
            type: 'POWER_ISOLATION_PERMIT',
            title: `Issue Remote SCADA 25kV Permit-to-Work (PTW)`,
            description: `Command SCADA Remote Isolation for Sub-sector 4 at KM ${b1Span} and deploy earthing discharge rods before crew entry.`,
            badge: 'SCADA 25kV PTW PERMIT',
            actionText: 'Sanction 25kV PTW Permit',
            isRecommended: true,
          },
          {
            id: `sol-${oheCnfId}-diesel`,
            type: 'REROUTE',
            title: `Enforce Diesel Haulage Substitution`,
            description: `Substitute Diesel locomotive for scheduled electric freight consists passing through neutral section during power block.`,
            badge: 'DIESEL DETOUR / HAULAGE',
            actionText: 'Authorize Diesel Consist',
          },
          {
            id: `sol-${oheCnfId}-subsector`,
            type: 'CAUTION_ORDER',
            title: `Sub-Sectoral Isolation (Adjacent Line Active)`,
            description: `Isolate OHE Catenary strictly on UP track while energizing DN line with physical safety barrier netting.`,
            badge: 'SUB-SECTOR ISOLATION',
            actionText: 'Isolate Local Track Only',
          },
        ];

        list.push({
          id: oheCnfId,
          blockId: b1.id,
          blockCode: b1.block_code,
          departmentCode: 'TRD',
          category: 'OHE_POWER_CONCURRENT_LOCK',
          categoryLabel: '25kV Traction / OHE Cut Isolation Lock',
          title: `25kV Catenary Power De-energization Hazard (${b1.block_code})`,
          description: `Electric power shutdown requested across KM ${b1Span}. Requires verified neutral section earthing and safety isolation interlock to prevent electrocution.`,
          startKm: b1Start,
          endKm: b1End,
          lineType: b1.line_type || 'UP',
          severity: 'CRITICAL',
          conflictingEntity: `25kV Traction SCADA Sub-Station TSS-4`,
          solutions: oheSolutions,
          isShadow: false,
          status: isOheRes ? 'RESOLVED' : 'PENDING',
          timestamp: 'Safety Interlock Lock',
        });
      }

      // =========================================================================
      // CATEGORY 3B: S&T ELECTRONIC INTERLOCKING & POINT MACHINE SAFETY LOCK
      // =========================================================================
      if (dept === 'SNT' || (b1.work_type && (b1.work_type.toLowerCase().includes('signal') || b1.work_type.toLowerCase().includes('point') || b1.work_type.toLowerCase().includes('interlock')))) {
        const sntCnfId = `cnf-${b1.id}-snt-interlock`;
        const isSntRes = resolvedIds.includes(sntCnfId) || b1.status === 'COORDINATED';

        const sntSolutions: ConflictSolution[] = [
          {
            id: `sol-${sntCnfId}-crank`,
            type: 'CAUTION_ORDER',
            title: `Authorize Crank Handle Point Clamping & Padlocking`,
            description: `Sanction crank handle release for point machine maintenance while clamping straight line route at 15 km/h.`,
            badge: 'S&T CRANK & PADLOCK',
            actionText: 'Authorize Crank Handle Protocol',
            isRecommended: true,
          },
          {
            id: `sol-${sntCnfId}-shift`,
            type: 'TIME_SHIFT',
            title: `Shift S&T Window to Station Non-Peak Slot (+45m)`,
            description: `Shift interlocking test by +45 minutes to avoid suburban commuter peak timetable.`,
            shiftMinutes: 45,
            badge: 'OFF-PEAK TIME SHIFT',
            actionText: 'Shift Window by +45m',
          },
        ];

        list.push({
          id: sntCnfId,
          blockId: b1.id,
          blockCode: b1.block_code,
          departmentCode: 'SNT',
          category: 'PARALLEL_BLOCK_COLLISION',
          categoryLabel: 'Electronic Interlocking Route Blockage',
          title: `Interlocking Point Detection Switch Hazard (${b1.block_code})`,
          description: `S&T point overhaul at KM ${b1Span} locks station throat switches. Route setting will be inhibited until telemetry validation passes.`,
          startKm: b1Start,
          endKm: b1End,
          lineType: b1.line_type || 'UP',
          severity: 'MAJOR',
          conflictingEntity: `Station Electronic Interlocking Panel (EI-01)`,
          solutions: sntSolutions,
          isShadow: false,
          status: isSntRes ? 'RESOLVED' : 'PENDING',
          timestamp: 'Interlocking Sweep Check',
        });
      }

      // =========================================================================
      // CATEGORY 3C: ENG HEAVY TRACK MACHINE & GANG SAFETY BUFFER
      // =========================================================================
      if (dept === 'ENG') {
        const engCnfId = `cnf-${b1.id}-eng-gang-buffer`;
        const isEngRes = resolvedIds.includes(engCnfId) || b1.status === 'COORDINATED';

        const engSolutions: ConflictSolution[] = [
          {
            id: `sol-${engCnfId}-banner`,
            type: 'CAUTION_ORDER',
            title: `Deploy Distance Banner Flags & Detonator Fog Signals`,
            description: `Post Engineering flagmen with banner flags at 600m and detonators at 1200m on approaching track to protect maintenance crew.`,
            badge: 'G&SR RULE 15.09 BANNER FLAG',
            actionText: 'Deploy Track Protection Banner',
            isRecommended: true,
          },
          {
            id: `sol-${engCnfId}-shift`,
            type: 'TIME_SHIFT',
            title: `Time Shift Tamping Machine Window (+30m)`,
            description: `Shift heavy track tamping start slot by +30 min to ensure track clearing ahead of scheduled sectional freight.`,
            shiftMinutes: 30,
            badge: 'TIME SHIFT (+30m)',
            actionText: 'Apply +30m Shift & Clear',
          },
        ];

        list.push({
          id: engCnfId,
          blockId: b1.id,
          blockCode: b1.block_code,
          departmentCode: 'ENG',
          category: 'PARALLEL_BLOCK_COLLISION',
          categoryLabel: 'Track Gang Protection & Clearance Buffer',
          title: `Track Safety Buffer & Machine Possession Hazard (${b1.block_code})`,
          description: `Heavy track plant operations at KM ${b1Span}. Physical occupation requires verified banner flag protection and gang safety separation.`,
          startKm: b1Start,
          endKm: b1End,
          lineType: b1.line_type || 'UP',
          severity: 'MAJOR',
          conflictingEntity: `Track Gang Safety Zone (KM ${b1Span})`,
          solutions: engSolutions,
          isShadow: false,
          status: isEngRes ? 'RESOLVED' : 'PENDING',
          timestamp: 'P-Way Safety Sweep',
        });
      }
    });

    // =========================================================================
    // CATEGORY 2: INTER-DEPARTMENTAL SPATIAL & TRACK SECTION OVERLAPS
    // =========================================================================
    for (let i = 0; i < evalBlocks.length; i++) {
      for (let j = i + 1; j < evalBlocks.length; j++) {
        const b1 = evalBlocks[i];
        const b2 = evalBlocks[j];

        const b1Start = Number(b1.start_km) || 0;
        const b1End = Number(b1.end_km) || 0;
        const b2Start = Number(b2.start_km) || 0;
        const b2End = Number(b2.end_km) || 0;

        const spatialOverlap = !(b1End + 0.8 < b2Start || b1Start - 0.8 > b2End);

        if (spatialOverlap && b1.department_code !== b2.department_code) {
          const overlapCnfId = `cnf-overlap-${b1.id}-${b2.id}`;
          const isRes = resolvedIds.includes(overlapCnfId) || b1.status === 'COORDINATED' || b2.status === 'COORDINATED';

          const solutions: ConflictSolution[] = [
            {
              id: `sol-${overlapCnfId}-unify`,
              type: 'SHADOW_BUNDLE',
              title: `Consolidate into Unified Joint Possession Window`,
              description: `Synchronize ${b1.department_code} (${b1.block_code}) and ${b2.department_code} (${b2.block_code}) into a single track possession. Saves 180 min track closure.`,
              badge: 'COORDINATED SHADOW BUNDLE',
              actionText: 'Bundle into Joint Possession',
              isRecommended: true,
            },
            {
              id: `sol-${overlapCnfId}-stagger-km`,
              type: 'CAUTION_ORDER',
              title: `Stagger Spatial Boundaries by 1.2 KM`,
              description: `Shift work boundary limits to provide mandatory 1.0 KM safe buffer zone between maintenance gangs.`,
              badge: 'SPATIAL BUFFER STAGGER',
              actionText: 'Apply 1.2 KM Boundary Buffer',
            },
            {
              id: `sol-${overlapCnfId}-sequence`,
              type: 'TIME_SHIFT',
              title: `Sequence Operations: ${b1.department_code} First, ${b2.department_code} at +90m`,
              description: `Sequential execution: allow ${b1.department_code} to finish primary work, followed immediately by ${b2.department_code}.`,
              shiftMinutes: 90,
              badge: 'TEMPORAL STAGGER (+90m)',
              actionText: 'Sequence Consecutive Slots',
            },
          ];

          list.push({
            id: overlapCnfId,
            blockId: b1.id,
            blockCode: b1.block_code,
            departmentCode: (b1.department_code || 'ENG') as 'ENG' | 'TRD' | 'SNT',
            category: 'PARALLEL_BLOCK_COLLISION',
            categoryLabel: 'Inter-Departmental Spatial Collision',
            title: `Track Section Conflict: ${b1.department_code} (${b1.block_code}) vs ${b2.department_code} (${b2.block_code})`,
            description: `Two departments are requesting concurrent occupancy on overlapping KM span (KM ${Math.min(b1Start, b2Start).toFixed(1)}–${Math.max(b1End, b2End).toFixed(1)}). Uncoordinated possession causes safety risk.`,
            startKm: Math.min(b1Start, b2Start),
            endKm: Math.max(b1End, b2End),
            lineType: b1.line_type || 'UP',
            severity: 'CRITICAL',
            conflictingEntity: `${b2.department_code} Possession (${b2.block_code})`,
            solutions,
            isShadow: false,
            status: isRes ? 'RESOLVED' : 'PENDING',
            timestamp: 'Spatial Sweep Match',
          });

          // =========================================================================
          // CATEGORY 4: MULTI-DEPARTMENT SHADOW BUNDLING GAIN & CO-UTILIZATION
          // =========================================================================
          const shadowId = `shadow-${b1.id}-${b2.id}`;
          const isShadowRes = resolvedIds.includes(shadowId) || b1.status === 'COORDINATED' || b2.status === 'COORDINATED';

          const shadowSolutions: ConflictSolution[] = [
            {
              id: `sol-${shadowId}-coallocate`,
              type: 'SHADOW_BUNDLE',
              title: `Execute Shadow Co-Allocation (+42.5% Corridor Efficiency)`,
              description: `Authorize joint shadow block. Co-allocates ${b1.department_code} and ${b2.department_code} under single unified sanction order.`,
              badge: 'CO-POSSESSION BUNDLE',
              actionText: 'Sanction Joint Shadow Window',
              isRecommended: true,
            },
            {
              id: `sol-${shadowId}-shared-plant`,
              type: 'SHADOW_BUNDLE',
              title: `Link Shared RRV Crane & Emergency Gang`,
              description: `Share track machine and overhead wiring inspection car between departments during unified window.`,
              badge: 'SHARED PLANT SYNERGY',
              actionText: 'Link Shared Equipment',
            },
          ];

          list.push({
            id: shadowId,
            blockId: b1.id,
            blockCode: b1.block_code,
            departmentCode: (b1.department_code || 'ENG') as 'ENG' | 'TRD' | 'SNT',
            category: 'SHADOW_OPPORTUNITY',
            categoryLabel: 'Multi-Department Shadow Bundling Opportunity',
            title: `Shadow Bundling Synergy: ${b1.department_code} + ${b2.department_code} Co-Utilization`,
            description: `High-value bundling opportunity identified. Combining ${b1.block_code} and ${b2.block_code} saves 3.2 hours of track downtime and guarantees +42.5% operational efficiency gain.`,
            startKm: Math.min(b1Start, b2Start),
            endKm: Math.max(b1End, b2End),
            lineType: b1.line_type || 'UP',
            severity: 'OPPORTUNITY',
            conflictingEntity: `${b2.department_code} Proposal (${b2.block_code})`,
            solutions: shadowSolutions,
            isShadow: true,
            status: isShadowRes ? 'RESOLVED' : 'PENDING',
            timestamp: 'Synergy Optimizer',
          });
        }
      }
    }

    return list;
  }, [allCorridorBlocks, resolvedIds]);

  // Separate Active and Resolved
  const activeConflicts = useMemo(() => {
    return allConflicts.filter((c) => c.status === 'PENDING');
  }, [allConflicts]);

  const resolvedConflicts = useMemo(() => {
    return allConflicts.filter((c) => c.status === 'RESOLVED');
  }, [allConflicts]);

  // Filter based on selected Category and Department
  const displayedConflicts = useMemo(() => {
    const sourceList = activeTab === 'ACTIVE' ? activeConflicts : resolvedConflicts;

    return sourceList.filter((c) => {
      // Department filter
      if (deptFilter !== 'ALL' && c.departmentCode !== deptFilter) {
        return false;
      }
      // Category filter
      if (catFilter !== 'ALL' && c.category !== catFilter) {
        return false;
      }
      return true;
    });
  }, [activeTab, activeConflicts, resolvedConflicts, deptFilter, catFilter]);

  // Execute Solution Selection
  const handleApplySolution = async (conflict: DynamicConflict, solution: ConflictSolution) => {
    markConflictResolved(conflict.id);

    // Apply the deconfliction in local store / backend directly to SANCTIONED (history)
    if (solution.type === 'TIME_SHIFT') {
      const mins = solution.shiftMinutes || 30;
      await sanctionBlock(
        conflict.blockId,
        `Resolved via ${solution.title}: Start shifted by +${mins}m.`
      );
    } else if (solution.type === 'SHADOW_BUNDLE') {
      await sanctionBlock(
        conflict.blockId,
        `Resolved via ${solution.title}: Bundled into coordinated shadow possession window with ${conflict.conflictingEntity}.`
      );
    } else {
      await sanctionBlock(
        conflict.blockId,
        `Resolved via ${solution.title}: ${solution.description}`
      );
    }

    if (onApplyResolution) {
      onApplyResolution(conflict.id, solution.shiftMinutes || 0);
    }

    // Deselect if this was the active block in Sanction Terminal
    if (selectedBlock?.id === conflict.blockId) {
      onSelectBlock?.(null as any);
    }

    // Trigger audio chime for successful resolution
    try {
      playPendingProposalChime(conflict.departmentCode);
    } catch {}

    // Trigger parent refresh if provided
    if (onRefresh) {
      setTimeout(() => onRefresh(), 300);
    }

    // Display confirmation toast
    setSuccessToast({
      message: `Conflict ${conflict.id} RESOLVED`,
      sub: `Applied solution: "${solution.title}". Block ${conflict.blockCode} deconflicted and cleared from active queue.`,
    });

    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  const getCategoryBadge = (cat: ConflictCategory) => {
    switch (cat) {
      case 'TRAIN_PATH_COLLISION':
        return {
          icon: <Train className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Train Timetable Collision',
          style: 'border-rose-500/50 bg-rose-950/40 text-rose-300',
        };
      case 'PARALLEL_BLOCK_COLLISION':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Inter-Dept Track Overlap',
          style: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
        };
      case 'OHE_POWER_CONCURRENT_LOCK':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
          label: '25kV Traction / OHE Lock',
          style: 'border-yellow-500/50 bg-yellow-950/40 text-yellow-300',
        };
      case 'SHADOW_OPPORTUNITY':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Shadow Bundling Gain (+42%)',
          style: 'border-purple-500/50 bg-purple-950/40 text-purple-300',
        };
    }
  };

  const getDeptColor = (dept: string) => {
    switch (dept) {
      case 'ENG':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      case 'TRD':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'SNT':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      default:
        return 'text-purple-400 border-purple-500/40 bg-purple-950/40';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4 font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-start justify-between shadow-lg animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-white text-xs">{successToast.message}</p>
              <p className="text-[11px] text-emerald-300/90 mt-0.5">{successToast.sub}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded border border-emerald-500/40"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-control-border pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white tracking-wide">
              AI Sweep-Line Conflict Resolution &amp; Shadow Bundling Engine
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Corridor-wide multi-domain collision detection, 4 conflict categories &amp; multi-solution deconfliction
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sweep Ticker Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-control-border text-[10px] font-mono text-control-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>4K Live Corridor Sweep</span>
          </div>

          <button
            onClick={handleManualSweep}
            disabled={isSweeping}
            title="Trigger Instant Corridor Sweep-Line Rescan"
            className="px-2.5 py-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSweeping ? 'animate-spin' : ''}`} />
            <span>{isSweeping ? 'Sweeping...' : 'Sweep Now'}</span>
          </button>
        </div>
      </div>

      {/* Live Stream Ticker & Controls Bar */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isAutoStreaming ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="font-extrabold text-white text-[11px]">
              {isAutoStreaming ? 'CORRIDOR TELEMETRY STREAM: ACTIVE' : 'STREAM: PAUSED'}
            </span>
          </div>
          <span className="text-control-muted text-[10px]">
            (Cadence: 18s • Queue: {streamIndex}/{CORRIDOR_STREAM_QUEUE.length})
          </span>
        </div>

        {streamFeedNotice && (
          <span className="text-[11px] text-cyan-300 animate-pulse font-bold">
            {streamFeedNotice}
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* Instant Ingestion Button */}
          <button
            type="button"
            onClick={injectNextStreamEvent}
            title="Immediately inject next realistic departmental proposal into corridor stream"
            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Inject Next Event</span>
          </button>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsAutoStreaming(!isAutoStreaming)}
            className="px-2.5 py-1 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-white text-[11px] transition flex items-center gap-1"
          >
            {isAutoStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isAutoStreaming ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Reset Queue to Baseline Button */}
          <button
            type="button"
            onClick={handleResetCorridorBaseline}
            title="Reset queue and remove extra proposals back to clean 4-block baseline"
            className="px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 text-[11px] transition flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Reset Baseline (4)</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Category + Department + Active/History Tabs */}
      <div className="flex flex-col gap-2.5 bg-control-bg/60 p-3 rounded-xl border border-control-border">
        {/* Row 1: The 4 Conflict Categories */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-control-muted text-[10px] uppercase font-bold mr-1 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Category:</span>
          </span>

          <button
            onClick={() => setCatFilter('ALL')}
            className={`px-2 py-1 rounded-lg border transition-colors ${
              catFilter === 'ALL'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                : 'bg-control-panel border-control-border text-control-muted hover:text-white'
            }`}
          >
            ALL (4 Domains)
          </button>

          <button
            onClick={() => setCatFilter('TRAIN_PATH_COLLISION')}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              catFilter === 'TRAIN_PATH_COLLISION'
                ? 'bg-rose-950 border-rose-400 text-rose-200 font-bold'
                : 'bg-control-panel border-control-border text-control-muted hover:text-rose-300'
            }`}
          >
            <Train className="w-3 h-3 text-rose-400" />
            <span>1. Train Collisions</span>
          </button>

          <button
            onClick={() => setCatFilter('PARALLEL_BLOCK_COLLISION')}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              catFilter === 'PARALLEL_BLOCK_COLLISION'
                ? 'bg-amber-950 border-amber-400 text-amber-200 font-bold'
                : 'bg-control-panel border-control-border text-control-muted hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>2. Inter-Dept Overlaps</span>
          </button>

          <button
            onClick={() => setCatFilter('OHE_POWER_CONCURRENT_LOCK')}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              catFilter === 'OHE_POWER_CONCURRENT_LOCK'
                ? 'bg-yellow-950 border-yellow-400 text-yellow-200 font-bold'
                : 'bg-control-panel border-control-border text-control-muted hover:text-yellow-300'
            }`}
          >
            <Zap className="w-3 h-3 text-yellow-400" />
            <span>3. 25kV OHE Locks</span>
          </button>

          <button
            onClick={() => setCatFilter('SHADOW_OPPORTUNITY')}
            className={`px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              catFilter === 'SHADOW_OPPORTUNITY'
                ? 'bg-purple-950 border-purple-400 text-purple-200 font-bold'
                : 'bg-control-panel border-control-border text-control-muted hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>4. Shadow Bundling</span>
          </button>
        </div>

        {/* Row 2: Department Filter + Tab Selection */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-control-border/60">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
            <span className="text-control-muted uppercase mr-1">Dept:</span>
            {(['ALL', 'ENG', 'TRD', 'SNT'] as DepartmentFilter[]).map((dept) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-2.5 py-0.5 rounded border transition-colors ${
                  deptFilter === dept
                    ? 'bg-cyan-900/60 border-cyan-400 text-cyan-200'
                    : 'bg-control-panel border-control-border text-control-muted hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'ACTIVE'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-control-panel border-control-border text-control-muted hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>ACTIVE HAZARDS ({activeConflicts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-control-panel border-control-border text-control-muted hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>RESOLVED HISTORY ({resolvedConflicts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Conflict Cards Stream */}
      <div className="space-y-4">
        {displayedConflicts.length === 0 ? (
          <div className="p-8 text-center text-control-muted font-mono text-xs border border-dashed border-control-border rounded-xl">
            {activeTab === 'ACTIVE'
              ? 'Sweep-Line Engine: All detected corridor conflicts for this filter have been deconflicted and resolved.'
              : 'No resolved conflict records found matching current filter.'}
          </div>
        ) : (
          displayedConflicts.map((cnf) => {
            const isResolved = resolvedIds.includes(cnf.id);
            const catBadge = getCategoryBadge(cnf.category);

            // Locate matching block object to allow inspecting in sanction terminal
            const matchingBlock = allCorridorBlocks.find(
              (b) => b.id === cnf.blockId || b.block_code === cnf.blockCode
            );

            return (
              <div
                key={cnf.id}
                className={`p-4 rounded-xl border transition-all ${
                  isResolved
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 shadow-sm'
                    : cnf.severity === 'CRITICAL'
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-md ring-1 ring-rose-500/20'
                    : cnf.isShadow
                    ? 'border-purple-500/50 bg-purple-950/20 shadow-md'
                    : 'border-amber-500/50 bg-amber-950/20 shadow-md'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold border ${catBadge.style}`}
                    >
                      {catBadge.icon}
                      <span>{catBadge.label}</span>
                    </span>

                    {/* Department Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${getDeptColor(
                        cnf.departmentCode
                      )}`}
                    >
                      {cnf.departmentCode}
                    </span>

                    {/* Block Reference Code */}
                    <span className="text-xs font-mono font-bold text-white">
                      Ref: {cnf.blockCode}
                    </span>

                    {/* Severity Indicator */}
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold border ${
                        isResolved
                          ? 'border-emerald-500 text-emerald-300 bg-emerald-950'
                          : cnf.severity === 'CRITICAL'
                          ? 'border-rose-500 text-rose-300 bg-rose-950 animate-pulse'
                          : cnf.severity === 'OPPORTUNITY'
                          ? 'border-purple-500 text-purple-300 bg-purple-950'
                          : 'border-amber-500 text-amber-300 bg-amber-950'
                      }`}
                    >
                      {isResolved ? 'RESOLVED & DECONFLICTED' : `${cnf.severity} PRIORITY`}
                    </span>
                  </div>

                  {/* Spatial KM Span */}
                  <div className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
                    <span>KM {cnf.startKm.toFixed(1)} – {cnf.endKm.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">({cnf.lineType} LINE)</span>
                  </div>
                </div>

                {/* Title & Description */}
                <h4 className="text-xs font-bold text-slate-100 font-mono mt-1 mb-1">
                  {cnf.title}
                </h4>
                <p className="text-xs text-slate-300 font-sans leading-relaxed mb-3">
                  {cnf.description}
                </p>

                {/* Conflicting Entity Details */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-control-border/80 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Intersecting Corridor Element: <strong className="text-white">{cnf.conflictingEntity}</strong></span>
                  </div>
                  <span className="text-[10px] text-control-muted">
                    Source: {cnf.timestamp}
                  </span>
                </div>

                {/* Multi-Solution Options Box */}
                <div className="space-y-2 border-t border-control-border/60 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-control-muted uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>AI Sweep-Line Recommended Solutions ({cnf.solutions.length} Options):</span>
                    </span>

                    {/* Option to load block in Chief Controller Sanction Terminal */}
                    {matchingBlock && onSelectBlock && (
                      <button
                        type="button"
                        onClick={() => onSelectBlock(matchingBlock)}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 transition flex items-center gap-1 hover:underline"
                        title="Open this block in Chief Controller Possession Sanction Terminal"
                      >
                        <span>Inspect in Sanction Terminal</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {isResolved ? (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between text-xs font-mono text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>This conflict was resolved. Block slot updated and cleared from pending queue.</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-bold">STATE: COORDINATED</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {cnf.solutions.map((sol, idx) => (
                        <div
                          key={sol.id}
                          className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            sol.isRecommended
                              ? 'bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400'
                              : 'bg-control-bg border-control-border hover:border-slate-600'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-control-border text-cyan-300">
                                OPTION {idx + 1}
                              </span>
                              <span className="text-xs font-mono font-bold text-white">
                                {sol.title}
                              </span>
                              <span className="text-[10px] font-mono text-amber-300">
                                • {sol.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans">
                              {sol.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplySolution(cnf, sol)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md flex-shrink-0 ${
                              sol.isRecommended
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/50'
                                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-control-border'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{sol.actionText}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
