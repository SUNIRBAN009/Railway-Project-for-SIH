import React from 'react';
import { useSocketStore } from '../../stores/socketStore';
import { AlertOctagon, BellOff, MapPin, ShieldAlert, CheckCircle2, Siren } from 'lucide-react';

export const EmergencyBanner: React.FC = () => {
  const { emergencyAlert, clearEmergencyAlert } = useSocketStore();

  if (!emergencyAlert) return null;

  return (
    <div className="relative z-50 bg-rose-950/95 border-b-2 border-rose-500 shadow-2xl backdrop-blur-md animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-white">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-rose-600 text-white shadow-lg animate-bounce">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-widest bg-rose-500 text-white">
                {emergencyAlert.priority || 'CRITICAL EMERGENCY'}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold font-mono text-rose-100">
                {emergencyAlert.title}
              </h3>
            </div>
            <p className="text-xs text-rose-200/90 font-mono mt-0.5">
              {emergencyAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {emergencyAlert.kmLocation && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-900/60 border border-rose-600/40 text-rose-200 text-xs font-mono">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>KM {emergencyAlert.kmLocation}</span>
            </div>
          )}

          <button
            onClick={clearEmergencyAlert}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono text-xs font-bold shadow-lg transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ACKNOWLEDGE & SILENCE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
