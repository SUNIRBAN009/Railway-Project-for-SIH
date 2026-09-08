import React, { useState } from 'react';
import { Block, BlockStatus, DepartmentCode } from '../../types';
import { DEMO_BLOCKS } from '../../services/demoData';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Zap,
  Clock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface BlockListProps {
  initialBlocks?: Block[];
  departmentFilter?: DepartmentCode;
  onSelectBlock?: (block: Block) => void;
}

export const BlockList: React.FC<BlockListProps> = ({
  initialBlocks = DEMO_BLOCKS,
  departmentFilter,
  onSelectBlock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL');

  const filteredBlocks = initialBlocks.filter((b) => {
    // Dept filter
    if (departmentFilter && b.department_code !== departmentFilter) return false;
    // Status filter
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    // Corridor filter
    if (corridorFilter !== 'ALL' && b.corridor?.code !== corridorFilter) return false;
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = b.block_code?.toLowerCase().includes(q);
      const matchWork = b.work_type?.toLowerCase().includes(q);
      const matchDesc = b.work_description?.toLowerCase().includes(q);
      return matchCode || matchWork || matchDesc;
    }
    return true;
  });

  const getStatusBadge = (status: BlockStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 animate-pulse ring-1 ring-emerald-500/30';
      case 'SANCTIONED':
        return 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300';
      case 'COORDINATED':
        return 'bg-purple-950/70 border-purple-500/60 text-purple-300';
      case 'SUBMITTED':
        return 'bg-blue-950/70 border-blue-500/60 text-blue-300';
      case 'PENDING_APPROVAL':
        return 'bg-amber-950/70 border-amber-500/60 text-amber-300';
      case 'CONFLICT_DETECTED':
        return 'bg-rose-950/70 border-rose-500/60 text-rose-300';
      case 'DRAFT':
      default:
        return 'bg-slate-900 border-slate-700 text-slate-400';
    }
  };

  const getDeptBadge = (dept: DepartmentCode) => {
    switch (dept) {
      case 'ENG':
        return 'text-blue-400 border-blue-500/30 bg-blue-950/30';
      case 'TRD':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/30';
      case 'SNT':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30';
      default:
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl shadow-lg overflow-hidden">
      {/* Search & Filter Header Bar */}
      <div className="p-4 border-b border-control-border bg-control-bg/60 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-control-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search block code, tamping, OHE..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-control-panel border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 text-xs font-mono bg-control-panel border border-control-border rounded-lg text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SANCTIONED">SANCTIONED</option>
            <option value="COORDINATED">COORDINATED</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
            <option value="DRAFT">DRAFT</option>
          </select>

          {/* Corridor Filter */}
          <select
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="px-2.5 py-2 text-xs font-mono bg-control-panel border border-control-border rounded-lg text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Corridors</option>
            <option value="NDLS-GZB-UP">NDLS-GZB (UP)</option>
            <option value="NDLS-GZB-DN">NDLS-GZB (DN)</option>
            <option value="GZB-ALJN-UP">GZB-ALJN (UP)</option>
          </select>

          <span className="text-[11px] font-mono text-control-muted shrink-0 pl-2">
            Showing <strong className="text-white">{filteredBlocks.length}</strong> blocks
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-control-bg/90 border-b border-control-border text-[11px] text-control-muted uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Block ID & Work</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Corridor & Line</th>
              <th className="px-4 py-3">KM Span</th>
              <th className="px-4 py-3">Schedule (IST)</th>
              <th className="px-4 py-3">25kV Power</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-control-border/60">
            {filteredBlocks.map((block) => (
              <tr
                key={block.id}
                onClick={() => onSelectBlock && onSelectBlock(block)}
                className="hover:bg-control-bg/80 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3.5">
                  <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {block.block_code}
                  </div>
                  <div className="text-[11px] text-control-muted truncate max-w-xs font-sans mt-0.5">
                    {block.work_type}
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDeptBadge(
                      block.department_code
                    )}`}
                  >
                    {block.department_code}
                  </span>
                </td>

                <td className="px-4 py-3.5">
                  <div className="text-slate-300">{block.corridor?.code}</div>
                  <div className="text-[10px] text-control-muted">{block.line_type} LINE</div>
                </td>

                <td className="px-4 py-3.5">
                  <div className="text-cyan-400 font-bold">
                    KM {block.start_km.toFixed(1)} – {block.end_km.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-control-muted">
                    {(block.end_km - block.start_km).toFixed(2)} KM
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {block.scheduled_start_time.split('T')[1]?.substring(0, 5)} –{' '}
                      {block.scheduled_end_time.split('T')[1]?.substring(0, 5)}
                    </span>
                  </div>
                  <div className="text-[10px] text-control-muted">
                    {block.scheduled_start_time.split('T')[0]}
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  {block.traction_power_cutoff_required ? (
                    <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>25kV CUTOFF</span>
                    </span>
                  ) : (
                    <span className="text-control-muted text-[10px]">LIVE POWER</span>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                      block.status
                    )}`}
                  >
                    {block.status}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-right">
                  <Link
                    to={`/blocks/${block.id}`}
                    className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-cyan-300 hover:border-cyan-500/40 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
