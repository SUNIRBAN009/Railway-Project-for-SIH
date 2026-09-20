import React, { useState } from 'react';
import { RiskMatrixResponse, DefectItem, RiskMatrixCell } from '../../services/api';
import { RiskColorChip } from './RiskColorChip';
import {
  X,
  Grid,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface RiskMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: RiskMatrixResponse | null;
  onSelectDefect?: (defect: DefectItem) => void;
}

export const RiskMatrixModal: React.FC<RiskMatrixModalProps> = ({
  isOpen,
  onClose,
  data,
  onSelectDefect,
}) => {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  if (!isOpen || !data) return null;

  const { summary, grid_cells, ranked_defects, why_number_one } = data;

  // Filter ranked defects by search, selected cell, or category
  const filteredDefects = ranked_defects.filter((d) => {
    if (selectedCell) {
      const [selCof, selLof] = selectedCell.split('x').map(Number);
      if (d.cof_score !== selCof || d.lof_score !== selLof) return false;
    }
    if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.defect_code.toLowerCase().includes(q) ||
        d.asset_tag.toLowerCase().includes(q) ||
        d.defect_type.toLowerCase().includes(q) ||
        d.location_km.toString().includes(q)
      );
    }
    return true;
  });

  // Map 5x5 cells by key 'cofxlof'
  const cellMap: Record<string, RiskMatrixCell> = {};
  grid_cells.forEach((c) => {
    cellMap[`${c.cof}x${c.lof}`] = c;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white font-mono">
                  Asset Reliability & 5×5 Risk Heatmap
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  Feature #92 • CoF × LoF
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Consequence of Failure (1–5) × Likelihood of Failure (1–5) • RDSO Track Safety Standard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase">Active Defects</span>
              <div className="text-xl font-bold text-white mt-0.5">{summary.total_active_defects}</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-600/40 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold">Extreme Risk</span>
              <div className="text-xl font-bold text-rose-300 mt-0.5">{summary.extreme_risk_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-bold">High Risk</span>
              <div className="text-xl font-bold text-amber-300 mt-0.5">{summary.high_risk_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-yellow-950/30 border border-yellow-600/40 text-center">
              <span className="text-[10px] text-yellow-400 uppercase font-bold">Medium Risk</span>
              <div className="text-xl font-bold text-yellow-300 mt-0.5">{summary.medium_risk_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Low Risk</span>
              <div className="text-xl font-bold text-emerald-300 mt-0.5">{summary.low_risk_count}</div>
            </div>
          </div>

          {/* 5x5 Heatmap Matrix Visualization */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                5×5 Multi-Tier Risk Matrix Grid
              </span>
              {selectedCell && (
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
                >
                  Clear Cell Filter ({selectedCell})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Columns Header: Likelihood (LoF 1-5) */}
                <div className="grid grid-cols-6 gap-1 text-center font-mono text-[11px] font-bold text-slate-400 mb-1">
                  <div className="py-1 text-slate-500 text-[10px]">CoF \ LoF</div>
                  <div className="py-1">LoF 1 (Rare)</div>
                  <div className="py-1">LoF 2 (Unlikely)</div>
                  <div className="py-1">LoF 3 (Possible)</div>
                  <div className="py-1">LoF 4 (Likely)</div>
                  <div className="py-1">LoF 5 (Frequent)</div>
                </div>

                {/* Rows: Consequence of Failure (CoF 5 down to 1) */}
                {[5, 4, 3, 2, 1].map((cof) => (
                  <div key={cof} className="grid grid-cols-6 gap-1 mb-1 items-center">
                    <div className="text-right pr-2 font-mono text-[11px] font-bold text-slate-400">
                      CoF {cof}
                    </div>

                    {[1, 2, 3, 4, 5].map((lof) => {
                      const key = `${cof}x${lof}`;
                      const cell = cellMap[key];
                      if (!cell) return <div key={key} className="h-14 bg-slate-900 rounded" />;

                      const isSelected = selectedCell === key;
                      const count = cell.defect_count || 0;

                      const getBg = () => {
                        switch (cell.category) {
                          case 'EXTREME_RISK':
                            return count > 0
                              ? 'bg-rose-600/35 border-rose-500 text-rose-200 ring-1 ring-rose-500/60'
                              : 'bg-rose-950/20 border-rose-900/40 text-rose-400/70';
                          case 'HIGH_RISK':
                            return count > 0
                              ? 'bg-amber-600/30 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                              : 'bg-amber-950/20 border-amber-900/40 text-amber-400/70';
                          case 'MEDIUM_RISK':
                            return count > 0
                              ? 'bg-yellow-600/25 border-yellow-500 text-yellow-200'
                              : 'bg-yellow-950/15 border-yellow-900/30 text-yellow-400/60';
                          case 'LOW_RISK':
                          default:
                            return count > 0
                              ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                              : 'bg-emerald-950/15 border-emerald-900/30 text-emerald-400/60';
                        }
                      };

                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedCell(isSelected ? null : key)}
                          className={`h-14 rounded-lg border p-1.5 flex flex-col justify-between text-left transition-all ${getBg()} ${
                            isSelected ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-[10px] font-bold opacity-80">
                              {cell.final_risk_score.toFixed(1)}
                            </span>
                            {count > 0 && (
                              <span className="px-1 py-0.2 rounded-full font-mono text-[9px] font-black bg-white text-black">
                                {count}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[9px] truncate">
                            {count > 0 ? (
                              <strong className="text-white underline">{count} defect{count > 1 ? 's' : ''}</strong>
                            ) : (
                              <span className="opacity-40">{cell.category.replace('_RISK', '')}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filter & Defects List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Identified Defects & Flaw Logs ({filteredDefects.length})
                </span>
                {selectedCell && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    Cell {selectedCell}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                >
                  <option value="ALL">All Categories</option>
                  <option value="EXTREME_RISK">Extreme Risk</option>
                  <option value="HIGH_RISK">High Risk</option>
                  <option value="MEDIUM_RISK">Medium Risk</option>
                  <option value="LOW_RISK">Low Risk</option>
                </select>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tag, KM, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 w-44 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Defects Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Defect Code</th>
                    <th className="p-3">Asset Tag / KM</th>
                    <th className="p-3">Defect Type</th>
                    <th className="p-3">CoF × LoF</th>
                    <th className="p-3">Risk Score</th>
                    <th className="p-3">Aging Score</th>
                    <th className="p-3">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDefects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        No active defects match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDefects.map((defect) => (
                      <tr
                        key={defect.id}
                        onClick={() => onSelectDefect && onSelectDefect(defect)}
                        className="hover:bg-slate-900/50 cursor-pointer transition"
                      >
                        <td className="p-3 font-bold text-white">
                          {defect.defect_code}
                          {defect.emergency_block_id && (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-600/50">
                              EMG BLOCK
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-cyan-300">{defect.asset_tag}</div>
                          <div className="text-[10px] text-slate-400">KM {defect.location_km.toFixed(1)}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {defect.defect_type_display}
                          {defect.flaw_depth_mm && (
                            <span className="text-[10px] text-amber-400 block">
                              Depth: {defect.flaw_depth_mm}mm
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-slate-300">
                            {defect.cof_score} × {defect.lof_score}
                          </span>
                        </td>
                        <td className="p-3">
                          <RiskColorChip
                            category={defect.category}
                            score={defect.final_risk_score}
                            size="sm"
                          />
                        </td>
                        <td className="p-3">
                          <div className="text-white font-bold">{defect.aging_score.toFixed(1)}</div>
                          <div className="text-[10px] text-slate-400">{defect.overdue_days}d overdue</div>
                        </td>
                        <td className="p-3 text-slate-300 text-[11px] uppercase">
                          {defect.recommended_action}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/60 font-mono text-xs">
          <span className="text-slate-400">
            Click on any defect row to view details or provision emergency track possession.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
