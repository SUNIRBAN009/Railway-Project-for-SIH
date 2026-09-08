import React from 'react';
import { DEMO_TRAINS } from '../../services/demoData';
import { Train as TrainIcon, Clock, AlertTriangle, CheckCircle2, TrendingDown, Layers } from 'lucide-react';

export const TrainImpactPanel: React.FC = () => {
  const impacts = [
    {
      train: DEMO_TRAINS[0], // 12424 Dibrugarh Rajdhani
      scheduledPass: '02:15 IST',
      rawDelayWithoutShift: '+38 min',
      mitigatedDelay: '0 min (ON TIME)',
      regulationStrategy: 'Possession time shifted to 02:45 after Rajdhani clearance',
      priorityRank: 'PRIORITY 1',
      status: 'PROTECTED',
    },
    {
      train: DEMO_TRAINS[1], // 12004 Lucknow Shatabdi
      scheduledPass: '05:30 IST',
      rawDelayWithoutShift: '+15 min',
      mitigatedDelay: '0 min (ON TIME)',
      regulationStrategy: 'Possession terminates at 04:30. Track certified 1 hr prior',
      priorityRank: 'PRIORITY 2',
      status: 'PROTECTED',
    },
    {
      train: DEMO_TRAINS[3], // Freight Rake
      scheduledPass: '01:00 IST',
      rawDelayWithoutShift: '+45 min',
      mitigatedDelay: '+18 min',
      regulationStrategy: 'Looped at Sahibabad Goods Loop 3 until CSM clearance',
      priorityRank: 'FREIGHT',
      status: 'REGULATED',
    },
  ];

  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-control-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrainIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Commercial Train Impact & Punctuality Assessment
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Traffic delay minimization model • Passenger train priority safeguard
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-control-muted">Division Punctuality Risk:</span>
          <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
            98.4% (PROTECTED)
          </span>
        </div>
      </div>

      {/* Table of Train Impacts */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-control-bg/80 border-b border-control-border text-[11px] text-control-muted uppercase">
            <tr>
              <th className="px-3 py-2.5">Train Designation</th>
              <th className="px-3 py-2.5">Scheduled Slot</th>
              <th className="px-3 py-2.5">Unmitigated Delay</th>
              <th className="px-3 py-2.5">Mitigated Delay</th>
              <th className="px-3 py-2.5">Regulation Strategy</th>
              <th className="px-3 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-control-border/60">
            {impacts.map((imp, idx) => (
              <tr key={idx} className="hover:bg-control-bg/50 transition">
                <td className="px-3 py-3">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>#{imp.train.train_number}</span>
                    <span className="text-control-muted font-sans font-normal text-[11px] truncate max-w-[140px]">
                      {imp.train.train_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400">{imp.priorityRank}</span>
                </td>

                <td className="px-3 py-3 text-slate-300">
                  {imp.scheduledPass}
                </td>

                <td className="px-3 py-3 text-rose-400 font-bold">
                  {imp.rawDelayWithoutShift}
                </td>

                <td className="px-3 py-3 text-emerald-400 font-bold">
                  {imp.mitigatedDelay}
                </td>

                <td className="px-3 py-3 text-control-muted text-[11px] font-sans max-w-xs">
                  {imp.regulationStrategy}
                </td>

                <td className="px-3 py-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      imp.status === 'PROTECTED'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-amber-950/70 border-amber-500 text-amber-300'
                    }`}
                  >
                    {imp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
