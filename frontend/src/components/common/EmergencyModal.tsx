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
  Volume2,
  VolumeX,
} from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const { emergencyAlert, clearEmergencyAlert, isAudioMuted, toggleAudioMute } = useSocketStore();
  const selectBlock = useMapStore((state) => state.selectBlock);
  const navigate = useNavigate();

  if (!emergencyAlert) return null;

  const handleAcknowledgeAndInspect = () => {
    const targetBlock = emergencyAlert.block_code || emergencyAlert.block_id || 'BLK-DEMO-001';
    clearEmergencyAlert();
    selectBlock(targetBlock);
    navigate('/map');
  };

  const blockCode = emergencyAlert.block_code || 'BLK-EMG-ACTIVE';
  const cautionSpeed = emergencyAlert.caution_speed_kmh || 20;
  const kmMark = emergencyAlert.kmLocation !== undefined ? `KM ${emergencyAlert.kmLocation}` : 'KM 14.8';
  const bufferSpan =
    emergencyAlert.start_km !== undefined && emergencyAlert.end_km !== undefined
      ? `KM ${emergencyAlert.start_km} — ${emergencyAlert.end_km}`
      : '±500m Protection Buffer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-slate-950 border-2 border-rose-600 rounded-2xl shadow-2xl shadow-rose-950/80 overflow-hidden">
        {/* Header Alert Ribbon */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-700 to-rose-950 px-6 py-4 flex items-center justify-between text-white border-b border-rose-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/20 animate-bounce">
              <Siren className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-widest bg-black/50 text-rose-200 border border-rose-400/40">
                SAFETY INTEGRITY LEVEL (SIL-4) ACTIVE TAKEOVER
              </span>
              <h2 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white mt-0.5">
                {emergencyAlert.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAudioMute}
              title={isAudioMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
              className="p-2 rounded-lg bg-black/40 border border-rose-400/40 text-rose-200 hover:text-white hover:bg-black/60 transition"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
            </button>
            <span className="font-mono text-xs text-rose-200 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-500/50 uppercase font-black tracking-wider">
              {emergencyAlert.priority || 'CRITICAL_ALARM'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-slate-200">
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-600/40 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-xs font-mono text-rose-300">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>TELEMETRY BROADCAST VIA DAPHNE ASGI CORRIDOR STREAM</span>
              </div>
              <span className="text-[10px] text-rose-400 font-bold">{emergencyAlert.id}</span>
            </div>
            <p className="text-sm font-mono text-rose-100 leading-relaxed">
              {emergencyAlert.message}
            </p>
          </div>

          {/* Critical Diagnostic Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase tracking-wider">Corridor</span>
              <p className="text-sm font-bold text-white mt-0.5 truncate">{emergencyAlert.corridor}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase tracking-wider">Flaw Location</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">{kmMark}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-control-border">
              <span className="text-control-muted text-[10px] uppercase tracking-wider">Emergency Block</span>
              <p className="text-sm font-bold text-cyan-400 mt-0.5 truncate">{blockCode}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/50 bg-rose-950/30">
              <span className="text-rose-400 text-[10px] uppercase tracking-wider font-bold">Caution Speed</span>
              <p className="text-sm font-bold text-rose-400 mt-0.5">{cautionSpeed} KM/H (HALT)</p>
            </div>
          </div>

          {/* Safety Buffer & Containment Details */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-control-border flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Safety Containment Span: <strong className="text-cyan-300">{bufferSpan}</strong></span>
            </div>
            {emergencyAlert.flaw_depth_mm && (
              <span className="px-2.5 py-0.5 rounded bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold">
                Flaw Depth: {emergencyAlert.flaw_depth_mm} mm (IMR Severe)
              </span>
            )}
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
                <span>Section signals switched to Danger Red</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Daphne ASGI siren chime broadcasted</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>OHE 25kV Feeder Section trip prepared</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>P-Way Rapid Response Gang dispatched</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/95 border-t border-control-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={clearEmergencyAlert}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-control-border text-control-muted hover:text-white hover:bg-slate-800 text-xs font-mono font-bold transition"
          >
            DISMISS ALERT
          </button>

          <button
            onClick={handleAcknowledgeAndInspect}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-mono text-xs font-black tracking-wide shadow-xl shadow-rose-950/60 transition flex items-center justify-center gap-2"
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
