import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DEMO_BLOCKS, DEMO_MACHINERY, DEMO_GANGS, DEMO_CONFLICTS, DEMO_AUDIT_TRAIL } from '../services/demoData';
import { Block, BlockStatus } from '../types';
import { ApprovalWorkflow } from '../components/blocks/ApprovalWorkflow';
import { ConflictAlert } from '../components/blocks/ConflictAlert';
import {
  ArrowLeft,
  Wrench,
  Zap,
  Clock,
  MapPin,
  ShieldCheck,
  FileText,
  Users,
  AlertTriangle,
  History,
  CheckCircle2,
} from 'lucide-react';

export const BlockDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Look up block or fallback to first demo block
  const foundBlock = DEMO_BLOCKS.find((b) => b.id === id) || DEMO_BLOCKS[0];
  const [block, setBlock] = useState<Block>(foundBlock);

  const machinery = DEMO_MACHINERY.find((m) => m.machine_code.includes('CSM') || m.machine_code.includes(block.equipment_required || '')) || DEMO_MACHINERY[0];
  const gang = DEMO_GANGS.find((g) => g.id === block.gang_id) || DEMO_GANGS[0];
  const conflict = DEMO_CONFLICTS.find((c) => c.block_id === block.id);

  const handleStatusChange = (newStatus: BlockStatus, remarks: string) => {
    setBlock((prev) => ({
      ...prev,
      status: newStatus,
      version: prev.version + 1,
    }));
  };

  const getStatusStyle = (status: BlockStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-950/70 border-emerald-500 text-emerald-300 animate-pulse';
      case 'SANCTIONED':
        return 'bg-cyan-950/70 border-cyan-500 text-cyan-300';
      case 'COORDINATED':
        return 'bg-purple-950/70 border-purple-500 text-purple-300';
      case 'SUBMITTED':
        return 'bg-blue-950/70 border-blue-500 text-blue-300';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar: Back & Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-control-border bg-control-panel hover:bg-control-bg text-control-muted hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-mono text-white">
                {block.block_code}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getStatusStyle(block.status)}`}>
                {block.status}
              </span>
              <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 rounded">
                REV v{block.version}.0
              </span>
            </div>
            <p className="text-xs text-control-muted mt-1 font-sans">
              {block.work_type} • {block.corridor?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-lg bg-control-panel border border-control-border text-slate-300">
            ID: <strong className="text-white">{block.id}</strong>
          </span>
          <span className="px-3 py-1 rounded-lg bg-control-panel border border-control-border text-slate-300">
            DEPT: <strong className="text-cyan-400">{block.department_code}</strong>
          </span>
        </div>
      </div>

      {/* Sweep-Line Conflict Banner if exists */}
      {conflict && <ConflictAlert conflict={conflict} />}

      {/* Grid of Key Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Spatial & Line Parameters */}
        <div className="bg-control-panel border border-control-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 border-b border-control-border pb-2">
            <MapPin className="w-4 h-4" />
            <span>Corridor & Spatial Alignment</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-control-muted">Corridor Section:</span>
              <span className="text-white font-bold">{block.corridor?.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Track Line:</span>
              <span className="text-white font-bold">{block.line_type} Main Line</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Kilometer Range:</span>
              <span className="text-cyan-300 font-bold">
                KM {block.start_km.toFixed(1)} – {block.end_km.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Linear Possession Span:</span>
              <span className="text-white">{(block.end_km - block.start_km).toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Max Section Speed:</span>
              <span className="text-slate-300">{block.corridor?.max_permissible_speed_kmh} km/h</span>
            </div>
          </div>
        </div>

        {/* Temporal Schedule Window */}
        <div className="bg-control-panel border border-control-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 border-b border-control-border pb-2">
            <Clock className="w-4 h-4" />
            <span>Temporal Possession Schedule</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-control-muted">Start Window:</span>
              <span className="text-white font-bold">
                {block.scheduled_start_time.split('T')[1]?.substring(0, 5)} IST
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">End Window:</span>
              <span className="text-white font-bold">
                {block.scheduled_end_time.split('T')[1]?.substring(0, 5)} IST
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Possession Date:</span>
              <span className="text-slate-300">{block.scheduled_start_time.split('T')[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Duration:</span>
              <span className="text-cyan-300 font-bold">180 Minutes (3.0 hrs)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Buffer Margin:</span>
              <span className="text-emerald-400">+15 mins clearance</span>
            </div>
          </div>
        </div>

        {/* Safety & Power Protocol */}
        <div className="bg-control-panel border border-control-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 border-b border-control-border pb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Traction & Caution Orders</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-control-muted">25kV Catenary Shutdown:</span>
              {block.traction_power_cutoff_required ? (
                <span className="text-amber-400 font-bold">REQUIRED (TRD Permit)</span>
              ) : (
                <span className="text-emerald-400 font-bold">NOT REQUIRED (Live)</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Caution Order:</span>
              <span className="text-white font-bold">45 km/h on UP Line</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Adjacent Line Safety:</span>
              <span className="text-slate-300">Banner flags + Detonators</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Safety Certificate:</span>
              <span className="text-emerald-400 font-bold">HermiT DL Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Machinery Fitness & Crew Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Machine Card */}
        <div className="bg-control-panel border border-control-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-control-border pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Assigned Heavy Track Machine</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
              {machinery.fitness_status}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-control-muted">Machine Model:</span>
              <span className="text-white font-bold">{machinery.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Machine Code:</span>
              <span className="text-cyan-400">{machinery.machine_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Fitness Certificate Valid:</span>
              <span className="text-emerald-400 font-bold">{machinery.fitness_valid_until}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Chief Operator:</span>
              <span className="text-slate-300">{machinery.operator_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Home Depot:</span>
              <span className="text-slate-400">{machinery.base_depot}</span>
            </div>
          </div>
        </div>

        {/* Crew Gang Card */}
        <div className="bg-control-panel border border-control-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-control-border pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Assigned Maintenance Gang</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 font-bold">
              {gang.status}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-control-muted">Gang Designation:</span>
              <span className="text-white font-bold">{gang.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Supervisor In-Charge:</span>
              <span className="text-cyan-400">{gang.supervisor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Hotline Phone:</span>
              <span className="text-slate-300">{gang.supervisor_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Field Strength:</span>
              <span className="text-white font-bold">{gang.strength} Linesmen</span>
            </div>
            <div className="flex justify-between">
              <span className="text-control-muted">Competency:</span>
              <span className="text-emerald-400 truncate max-w-[200px]">{gang.certification}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Tier Digital Approval Workflow */}
      <ApprovalWorkflow block={block} onStatusChange={handleStatusChange} />

      {/* Digital Audit Trail */}
      <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold font-mono text-white border-b border-control-border pb-3">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Complete Digital Audit & Signoff Trail</span>
        </div>

        <div className="divide-y divide-control-border/60">
          {DEMO_AUDIT_TRAIL.map((entry) => (
            <div key={entry.id} className="py-3 flex items-start justify-between gap-4 text-xs font-mono">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{entry.action}</span>
                    <span className="text-control-muted">•</span>
                    <span className="text-cyan-400">{entry.actor_name}</span>
                    <span className="text-[10px] text-control-muted">({entry.actor_role})</span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 font-sans">{entry.remarks}</p>
                </div>
              </div>

              <span className="text-[11px] text-control-muted shrink-0">
                {entry.timestamp.split('T')[0]} {entry.timestamp.split('T')[1]?.substring(0, 5)} IST
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
