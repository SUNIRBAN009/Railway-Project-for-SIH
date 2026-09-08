import React from 'react';
import { useSocketStore } from '../../stores/socketStore';
import { useMapStore } from '../../stores/mapStore';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Siren,
  MapPin,
  ShieldAlert,
  Radio,
  Clock,
  CheckCircle2,
  ExternalLink,
  ZapOff,
} from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const { emergencyAlert, clearEmergencyAlert } = useSocketStore();
  const selectBlock = useMapStore((state) => state.selectBlock);
  const navigate = useNavigate();

  if (!emergencyAlert) return null;

  const handleAcknowledgeAndInspect = () => {
    clearEmergencyAlert();
    selectBlock('BLK-DEMO-001');
    navigate('/map');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-rose-600 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Alert Ribbon */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-700 to-rose-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/20 animate-bounce">
              <Siren className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-widest bg-black/40 text-rose-200 border border-rose-400/30">
                SAFETY INTEGRITY LEVEL (SIL-4) TAKEOVER
              </span>
              <h2 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white mt-0.5">
                {emergencyAlert.title}
              </h2>
            </div>
          </div>
          <span className="font-mono text-xs text-rose-200 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/40">
            EMERGENCY PRIORITY 1
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-slate-200">
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-300">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>TELEMETRY BROADCAST VIA DAPHNE ASGI CORRIDOR STREAM</span>
            </div>
            <p className="text-sm font-mono text-rose-100 leading-relaxed">
              {emergencyAlert.message}
            </p>
          </div>

          {/* Critical Diagnostic Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase">Corridor</span>
              <p className="text-sm font-bold text-white mt-0.5">{emergencyAlert.corridor}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase">Kilometer Mark</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">
                {emergencyAlert.kmLocation ? `KM ${emergencyAlert.kmLocation}` : 'KM 14.8 (DN Main)'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase">Safe Braking</span>
              <p className="text-sm font-bold text-cyan-400 mt-0.5">1,200m Trajectory</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40 bg-rose-950/20">
              <span className="text-rose-400 text-[10px] uppercase">Track Aspect</span>
              <p className="text-sm font-bold text-rose-400 mt-0.5">RED / DANGER (HALT)</p>
            </div>
          </div>

          {/* Automated Safety Interventions Active */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-control-border space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-control-muted uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Automated Interlocking Actions Executed:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Signals S-14 & S-16 switched to Danger Red</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Section Controller audio alert triggered</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>OHE 25kV Feeder Section trip prepared</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>USFD P-Way Rapid Response Gang dispatched</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-control-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={clearEmergencyAlert}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-control-border text-control-muted hover:text-white hover:bg-slate-800 text-xs font-mono font-bold transition"
          >
            DISMISS ALERT
          </button>

          <button
            onClick={handleAcknowledgeAndInspect}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-mono text-xs font-black tracking-wide shadow-xl transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE & OPEN 3D GIS RADAR</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
