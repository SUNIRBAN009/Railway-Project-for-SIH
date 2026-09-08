import React, { useState } from 'react';
import { CrewGang, DepartmentCode } from '../../types';
import { DEMO_GANGS } from '../../services/demoData';
import { Users, Phone, ShieldCheck, MapPin, CheckCircle2, Search, UserCheck } from 'lucide-react';

interface CrewAssignmentProps {
  departmentFilter?: DepartmentCode;
}

export const CrewAssignment: React.FC<CrewAssignmentProps> = ({ departmentFilter }) => {
  const [gangs, setGangs] = useState<CrewGang[]>(DEMO_GANGS);
  const [search, setSearch] = useState('');
  const [selectedGang, setSelectedGang] = useState<CrewGang | null>(null);

  const filteredGangs = gangs.filter((g) => {
    if (departmentFilter && g.department !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.supervisor_name.toLowerCase().includes(q) ||
        g.base_station.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DEPLOYED':
        return 'bg-blue-950/70 border-blue-500/50 text-blue-300 animate-pulse';
      case 'AVAILABLE':
        return 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300';
      case 'STANDBY':
      default:
        return 'bg-amber-950/70 border-amber-500/50 text-amber-300';
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-control-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-mono text-white">
              Maintenance Gang Roster & Field Crew Deployment
            </h3>
            <p className="text-xs text-control-muted mt-0.5 font-mono">
              Certified field manpower • Safety protocol briefings & supervisor contacts
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 text-control-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gang or supervisor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-control-bg border border-control-border rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Gang Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGangs.map((g) => (
          <div
            key={g.id}
            onClick={() => setSelectedGang(g)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedGang?.id === g.id
                ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50'
                : 'border-control-border bg-control-bg/60 hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 block uppercase">
                  {g.gang_code} • {g.department}
                </span>
                <h4 className="text-sm font-bold text-white font-mono mt-0.5">{g.name}</h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadge(
                  g.status
                )}`}
              >
                {g.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono text-slate-300 my-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-control-muted" />
                <span>{g.supervisor_name}</span>
              </div>
              <div className="flex items-center gap-2 text-control-muted">
                <Phone className="w-3.5 h-3.5" />
                <span>{g.supervisor_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-control-muted">
                <MapPin className="w-3.5 h-3.5" />
                <span>Base: {g.base_station}</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>Strength: {g.strength} Linesmen / Trackmen</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-control-border/60">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 truncate">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">{g.certification}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
