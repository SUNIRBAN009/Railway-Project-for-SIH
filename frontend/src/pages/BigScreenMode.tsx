import React, { useState, useEffect } from 'react';
import { DEMO_BLOCKS, DEMO_TRAINS, DEMO_CONFLICTS } from '../services/demoData';
import {
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Train,
  Wrench,
  Zap,
  ShieldAlert,
  Flame,
  Activity,
  Layers,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const BigScreenMode: React.FC = () => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono flex flex-col justify-between space-y-6 select-none overflow-hidden">
      {/* 4K Panoramic Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4 bg-slate-950/80 px-6 py-4 rounded-2xl border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/coa')}
            title="Exit Big Screen Mode"
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-control-muted hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-widest">
                  NORTHERN RAILWAY • CENTRAL OPERATIONS THEATER
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold">
                  4K VIDEO WALL PROJECTION
                </span>
              </div>
              <p className="text-xs text-cyan-400/90 font-mono">
                DELHI DIVISION • NDLS–GZB–ALJN HIGH-DENSITY PASSENGER & FREIGHT CORRIDOR
              </p>
            </div>
          </div>
        </div>

        {/* Big Digital Clock & ASGI Beacon */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-2 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-4 h-4" />
            <span>DAPHNE ASGI WEBSOCKET: CONNECTED</span>
          </div>

          <div className="flex items-center gap-2 text-xl font-extrabold text-cyan-300 bg-cyan-950/70 border border-cyan-500/50 px-4 py-2 rounded-xl shadow-inner">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="tracking-widest">{format(time, 'HH:mm:ss')}</span>
            <span className="text-xs text-control-muted">IST</span>
          </div>
        </div>
      </div>

      {/* Main Multi-Monitor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Col: Live Corridor Possession Wall */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Active Track Possessions</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 border border-blue-500 text-blue-300">
                {DEMO_BLOCKS.filter((b) => b.status === 'ACTIVE').length} OCCUPIED
              </span>
            </div>

            <div className="space-y-3">
              {DEMO_BLOCKS.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{b.block_code}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">{b.work_type}</p>
                  <div className="flex items-center justify-between text-[11px] text-control-muted border-t border-slate-800/80 pt-1.5">
                    <span className="text-cyan-400 font-bold">KM {b.start_km.toFixed(1)}–{b.end_km.toFixed(1)}</span>
                    <span className="text-slate-300">{b.scheduled_start_time.split('T')[1]?.substring(0, 5)}–{b.scheduled_end_time.split('T')[1]?.substring(0, 5)} IST</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-control-muted">
            Auto-refresh interval: 5 seconds • PostGIS SRID 4326
          </div>
        </div>

        {/* Center Col: 3D GIS Radar Canvas */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>3D GIS Digital Twin Radar View</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 border border-emerald-500 text-emerald-300">
              60 FPS WEBGL
            </span>
          </div>

          {/* Central Animated Radar Simulation */}
          <div className="flex-1 rounded-xl bg-black border border-cyan-950/80 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 via-black to-black" />
            <div className="w-48 h-48 rounded-full border border-cyan-500/20 flex items-center justify-center relative animate-spin" style={{ animationDuration: '20s' }}>
              <div className="w-32 h-32 rounded-full border border-cyan-500/30" />
              <div className="w-16 h-16 rounded-full border border-cyan-500/40" />
              <div className="absolute top-0 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400" />
            </div>

            <div className="z-10 mt-6 space-y-2">
              <h4 className="text-base font-extrabold text-cyan-300">
                NDLS–GZB CORRIDOR VECTOR RADAR
              </h4>
              <p className="text-xs text-control-muted max-w-xs mx-auto">
                Real-time telemetry listening on Daphne channel layer <code className="text-cyan-400">corridor.dli.main</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs z-10">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">TRAINS EN ROUTE</span>
              <span className="font-extrabold text-white text-base">4</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">PUNCTUALITY</span>
              <span className="font-extrabold text-emerald-400 text-base">98.4%</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-control-muted block">SHADOW SAVING</span>
              <span className="font-extrabold text-cyan-400 text-base">+42.5%</span>
            </div>
          </div>
        </div>

        {/* Right Col: High Priority Safety & Train Radar */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Safety Critical Interventions</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-500 text-rose-300 animate-pulse">
                1 FLAGGED
              </span>
            </div>

            {/* Critical Rail Flaw */}
            <div className="p-3.5 rounded-xl border border-rose-500/60 bg-rose-950/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-rose-200 uppercase">USFD Transverse Rail Crack</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900 text-white">KM 14.8</span>
              </div>
              <p className="text-xs text-rose-100 font-sans">
                Fatigue flaw at NDLS–GZB UP line. Automated jogglled fishplate containment enforced under speed cap 30 km/h.
              </p>
            </div>

            {/* Commercial Train Telemetry */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-control-muted font-bold block uppercase">
                Commercial Train Occupancy Radar:
              </span>
              {DEMO_TRAINS.map((trn) => (
                <div
                  key={trn.id}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">#{trn.train_number}</span>
                    <span className="text-control-muted text-[10px] block">{trn.train_name}</span>
                  </div>
                  <span className="text-cyan-400 font-bold">{trn.max_speed_kmh} km/h max</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 flex items-center justify-between">
            <span>HermiT DL Invariant Verification:</span>
            <strong>ACTIVE (0 VIOLATIONS)</strong>
          </div>
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-control-muted">
        <span>Northern Railway Automatic Block Planning Platform (PS 26027) • Presentation Mode</span>
        <span className="text-cyan-400 font-bold">Press ESC or click Back to exit Video Wall mode</span>
      </div>
    </div>
  );
};
