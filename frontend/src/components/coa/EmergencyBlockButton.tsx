import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Flame, Radio, CheckCircle2 } from 'lucide-react';

interface EmergencyBlockButtonProps {
  onDeclareEmergency?: (corridor: string, startKm: number, reason: string) => void;
}

export const EmergencyBlockButton: React.FC<EmergencyBlockButtonProps> = ({
  onDeclareEmergency,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('USFD Rail Fatigue Fracture (Transverse Crack)');
  const [corridor, setCorridor] = useState('NDLS-GZB-UP');
  const [kmLocation, setKmLocation] = useState(14.8);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isDeclared, setIsDeclared] = useState(false);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationWord !== 'HALT TRAFFIC') return;

    setIsDeclared(true);
    if (onDeclareEmergency) {
      onDeclareEmergency(corridor, kmLocation, reason);
    }

    setTimeout(() => {
      setIsDeclared(false);
      setIsOpen(false);
      setConfirmationWord('');
    }, 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-extrabold transition flex items-center gap-2 shadow-lg shadow-rose-950 border border-rose-400 animate-pulse"
      >
        <Flame className="w-4 h-4 text-amber-300" />
        <span>DECLARE EMERGENCY TRACK BLOCK</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-control-panel border-2 border-rose-500/80 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl shadow-rose-950/80">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-control-border pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-900/80 border border-rose-500 text-rose-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-mono text-white">
                    Emergency Track Halt Declaration
                  </h3>
                  <p className="text-xs text-rose-300 font-mono">
                    High-Consequence Safety Protocol (Indian Railways Rulebook GR 4.09)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-control-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDeclared ? (
              <div className="p-6 text-center space-y-2 font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/50 rounded-xl">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <h4 className="text-sm font-bold uppercase">CORRIDOR EMERGENCY HALT BROADCASTED</h4>
                <p className="text-xs text-slate-300">
                  Section signals placed at DANGER (Red). All trains approaching KM {kmLocation} halted.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirm} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Defect / Emergency Hazard Cause</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
                  >
                    <option value="USFD Rail Fatigue Fracture (Transverse Crack)">
                      USFD Rail Fatigue Fracture (Transverse Crack)
                    </option>
                    <option value="25kV Catenary Parting / OHE Wire Dropper Entanglement">
                      25kV Catenary Parting / OHE Wire Dropper Entanglement
                    </option>
                    <option value="Electronic Interlocking Route Conflict / Point Burst">
                      Electronic Interlocking Route Conflict / Point Burst
                    </option>
                    <option value="Severe Track Buckling (High Temperature Rail Expansion)">
                      Severe Track Buckling (High Temperature Rail Expansion)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Target Line Corridor</label>
                    <select
                      value={corridor}
                      onChange={(e) => setCorridor(e.target.value)}
                      className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
                    >
                      <option value="NDLS-GZB-UP">NDLS–GZB (UP Line)</option>
                      <option value="NDLS-GZB-DN">NDLS–GZB (DOWN Line)</option>
                      <option value="GZB-ALJN-UP">GZB–ALJN (UP Line)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Exact Kilometer Post</label>
                    <input
                      type="number"
                      step="0.1"
                      value={kmLocation}
                      onChange={(e) => setKmLocation(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-control-bg border border-control-border rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Safety safeguard input */}
                <div className="p-3.5 rounded-xl border border-rose-500/50 bg-rose-950/40 space-y-2">
                  <p className="text-[11px] text-rose-200 font-sans">
                    To prevent accidental activation, type <strong className="text-white font-mono">HALT TRAFFIC</strong> below to initiate immediate section signal overrides:
                  </p>
                  <input
                    type="text"
                    value={confirmationWord}
                    onChange={(e) => setConfirmationWord(e.target.value)}
                    placeholder="Type HALT TRAFFIC to confirm"
                    className="w-full px-3 py-2 bg-black border border-rose-500 rounded-lg text-white font-bold tracking-widest text-center"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl border border-control-border text-control-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmationWord !== 'HALT TRAFFIC'}
                    className={`px-5 py-2 rounded-xl text-white font-bold transition shadow-lg ${
                      confirmationWord === 'HALT TRAFFIC'
                        ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-rose-950'
                        : 'bg-rose-900/40 text-slate-500 cursor-not-allowed border border-rose-900/40'
                    }`}
                  >
                    CONFIRM & HALT CORRIDOR
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
