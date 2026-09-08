import React, { useState } from 'react';
import { MaterialStock, DepartmentCode } from '../../types';
import { DEMO_MATERIALS } from '../../services/demoData';
import { Package, AlertCircle, CheckCircle2, TrendingDown, Plus, Search } from 'lucide-react';

interface MaterialInventoryProps {
  departmentFilter?: DepartmentCode;
}

export const MaterialInventory: React.FC<MaterialInventoryProps> = ({ departmentFilter }) => {
  const [stocks, setStocks] = useState<MaterialStock[]>(DEMO_MATERIALS);
  const [search, setSearch] = useState('');
  const [requestedId, setRequestedId] = useState<string | null>(null);

  const filteredStocks = stocks.filter((m) => {
    if (departmentFilter && m.department !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.item_code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReorder = (id: string) => {
    setRequestedId(id);
    setTimeout(() => setRequestedId(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300';
      case 'LOW':
        return 'bg-amber-950/70 border-amber-500/50 text-amber-300';
      case 'CRITICAL':
      default:
        return 'bg-rose-950/70 border-rose-500/50 text-rose-300 animate-pulse';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-control-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-mono text-white">
              Permanent Way & Electrical Material Depot Inventory
            </h3>
            <p className="text-xs text-control-muted mt-0.5 font-mono">
              Stock levels for 60kg rails, PSC sleepers, OHE catenary copper wire & relays
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 text-control-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material or code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-control-bg border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStocks.map((item) => {
          const percentage = Math.min(100, Math.round((item.current_stock / (item.required_minimum * 1.5)) * 100));
          const isLow = item.status === 'LOW' || item.status === 'CRITICAL';

          return (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-control-border bg-control-bg/60 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block uppercase">
                    {item.item_code} • {item.department}
                  </span>
                  <h4 className="text-xs font-bold text-white font-mono mt-0.5 line-clamp-2">
                    {item.name}
                  </h4>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getStatusBadge(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-control-muted">Current Stock:</span>
                  <span className="font-bold text-white">
                    {item.current_stock} / min {item.required_minimum} {item.unit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-control-panel overflow-hidden border border-control-border">
                  <div
                    style={{ width: `${percentage}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'OPTIMAL'
                        ? 'bg-emerald-500'
                        : item.status === 'LOW'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-control-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-control-muted truncate max-w-[150px]">
                  Depot: {item.location}
                </span>

                <button
                  type="button"
                  onClick={() => handleReorder(item.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                    requestedId === item.id
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'bg-control-panel border border-control-border text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
                  }`}
                >
                  {requestedId === item.id ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Requisitioned</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Indent Stock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
