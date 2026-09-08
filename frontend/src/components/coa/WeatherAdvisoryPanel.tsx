import React from 'react';
import { CloudFog, Thermometer, Wind, Droplets, AlertTriangle, ShieldCheck } from 'lucide-react';

export const WeatherAdvisoryPanel: React.FC = () => {
  return (
    <div className="bg-control-panel border border-control-border rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-control-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CloudFog className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white">
              Meteorological & Track Environmental Telemetry
            </h3>
          </div>
          <p className="text-xs text-control-muted mt-0.5 font-mono">
            Northern Railway Met Cell • Automated speed restrictions & rail expansion sensors
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/70 border border-amber-500/50 text-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>FOG ADVISORY ACTIVE</span>
        </span>
      </div>

      {/* Environmental Sensor Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Fog Visibility */}
        <div className="p-3.5 rounded-xl bg-control-bg/80 border border-control-border space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between text-control-muted">
            <span>VISIBILITY</span>
            <CloudFog className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-extrabold text-amber-400">140 <span className="text-xs text-control-muted font-normal">Meters</span></div>
          <p className="text-[10px] text-rose-300">Fog Safe Cap: 60 km/h</p>
        </div>

        {/* Rail Temp */}
        <div className="p-3.5 rounded-xl bg-control-bg/80 border border-control-border space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between text-control-muted">
            <span>RAIL TEMP</span>
            <Thermometer className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-extrabold text-white">44.2° <span className="text-xs text-control-muted font-normal">Celsius</span></div>
          <p className="text-[10px] text-emerald-400">Buckling Threshold: 58°C</p>
        </div>

        {/* Wind Speed */}
        <div className="p-3.5 rounded-xl bg-control-bg/80 border border-control-border space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between text-control-muted">
            <span>WIND VELOCITY</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-extrabold text-white">14 <span className="text-xs text-control-muted font-normal">km/h</span></div>
          <p className="text-[10px] text-emerald-400">OHE Sway: Nominal</p>
        </div>

        {/* Precipitation */}
        <div className="p-3.5 rounded-xl bg-control-bg/80 border border-control-border space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between text-control-muted">
            <span>RAINFALL</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-extrabold text-white">0.0 <span className="text-xs text-control-muted font-normal">mm/h</span></div>
          <p className="text-[10px] text-emerald-400">Dry Ballast Bed</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs font-mono text-amber-200 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Advisory to Section Controller: All locomotive drivers operating between Ghaziabad and Aligarh instructed to sound horn periodically and utilize GPS fog safety devices (FSD).
        </span>
      </div>
    </div>
  );
};
