import React, { useState } from 'react';
import { Block, BlockStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, Send, UserCheck, ShieldCheck, FileCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface ApprovalWorkflowProps {
  block: Block;
  onStatusChange?: (newStatus: BlockStatus, remarks: string) => void;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ block, onStatusChange }) => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      id: 'DRAFT',
      title: 'JE Proposal',
      role: 'Junior Engineer',
      description: 'Parameter formulation & machinery tagging',
      isDone: ['SUBMITTED', 'COORDINATED', 'SANCTIONED', 'ACTIVE', 'COMPLETED'].includes(block.status),
      isActive: block.status === 'DRAFT' || block.status === 'PENDING_APPROVAL',
    },
    {
      id: 'SUBMITTED',
      title: 'SSE Endorsement',
      role: 'Senior Section Engineer',
      description: 'Fitness verification & gang assignment signoff',
      isDone: ['COORDINATED', 'SANCTIONED', 'ACTIVE', 'COMPLETED'].includes(block.status),
      isActive: block.status === 'SUBMITTED',
    },
    {
      id: 'COORDINATED',
      title: 'Controller Transmission',
      role: 'Section Controller',
      description: 'Sweep-line simulation & train slot coordination',
      isDone: ['SANCTIONED', 'ACTIVE', 'COMPLETED'].includes(block.status),
      isActive: block.status === 'COORDINATED',
    },
    {
      id: 'SANCTIONED',
      title: 'COA Sanction',
      role: 'Chief Controller',
      description: 'Final corridor possession authority granted',
      isDone: ['ACTIVE', 'COMPLETED'].includes(block.status) || block.status === 'SANCTIONED',
      isActive: block.status === 'SANCTIONED',
    },
  ];

  const handleAction = (targetStatus: BlockStatus) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onStatusChange) {
        onStatusChange(targetStatus, remarks || 'Workflow approval progressed via digital signoff.');
      }
      setRemarks('');
    }, 400);
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-5 border-b border-control-border pb-3">
        <div>
          <h3 className="text-sm font-extrabold font-mono text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            3-Tier Digital Signoff Chain (IR Digital Possession Protocol)
          </h3>
          <p className="text-xs text-control-muted mt-0.5">
            Sequential approval trail compliant with Indian Railways General Rules (GR 4.09)
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
          STATUS: {block.status}
        </span>
      </div>

      {/* Visual Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`p-3.5 rounded-xl border transition-all ${
              step.isDone
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                : step.isActive
                ? 'border-cyan-400 bg-cyan-950/30 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                : 'border-control-border bg-control-bg/50 text-control-muted opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold text-control-muted">
                STAGE 0{idx + 1}
              </span>
              {step.isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : step.isActive ? (
                <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-700" />
              )}
            </div>

            <h4 className="text-xs font-bold font-mono text-white leading-tight">
              {step.title}
            </h4>
            <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{step.role}</p>
            <p className="text-[10px] text-control-muted mt-1 leading-snug">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Approval Input & Actions */}
      <div className="p-4 rounded-xl bg-control-bg/80 border border-control-border flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-mono text-slate-300 block">
            Digital Signoff Endorsement Remarks / Caution Order Notes:
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g., Gang briefed on OHE earthing protocols. Speed restriction 45 km/h endorsed."
            className="w-full px-3 py-2 text-xs font-mono bg-control-panel border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {block.status === 'DRAFT' && (
            <button
              onClick={() => handleAction('SUBMITTED')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to SSE</span>
            </button>
          )}

          {block.status === 'SUBMITTED' && (
            <button
              onClick={() => handleAction('COORDINATED')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Endorse & Transmit to COA</span>
            </button>
          )}

          {block.status === 'COORDINATED' && (
            <button
              onClick={() => handleAction('SANCTIONED')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Grant COA Sanction</span>
            </button>
          )}

          {block.status === 'SANCTIONED' && (
            <button
              onClick={() => handleAction('ACTIVE')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Commence Track Possession</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
