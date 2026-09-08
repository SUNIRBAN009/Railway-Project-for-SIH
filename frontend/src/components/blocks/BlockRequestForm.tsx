import React, { useState } from 'react';
import { DepartmentCode, LineType, Block } from '../../types';
import { DEMO_CORRIDORS, DEMO_MACHINERY, DEMO_GANGS } from '../../services/demoData';
import {
  Wrench,
  Zap,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Layers,
} from 'lucide-react';

interface BlockRequestFormProps {
  departmentCode: DepartmentCode;
  onSuccess?: (createdBlock: Partial<Block>) => void;
  onCancel?: () => void;
}

export const BlockRequestForm: React.FC<BlockRequestFormProps> = ({
  departmentCode,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [corridorCode, setCorridorCode] = useState(DEMO_CORRIDORS[0].code);
  const [lineType, setLineType] = useState<LineType>('UP');
  const [workType, setWorkType] = useState('Track Tamping (CSM)');
  const [startKm, setStartKm] = useState(14.2);
  const [endKm, setEndKm] = useState(18.5);

  const [selectedMachine, setSelectedMachine] = useState(DEMO_MACHINERY[0].machine_code);
  const [selectedGang, setSelectedGang] = useState(DEMO_GANGS[0].id);

  const [requestDate, setRequestDate] = useState('2026-09-09');
  const [startTime, setStartTime] = useState('02:00');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [bufferMarginMinutes, setBufferMarginMinutes] = useState(15);

  const [powerCutoffRequired, setPowerCutoffRequired] = useState(departmentCode === 'TRD');
  const [cautionSpeedKmh, setCautionSpeedKmh] = useState(45);
  const [adjacentLineProtection, setAdjacentLineProtection] = useState(true);
  const [workDescription, setWorkDescription] = useState(
    'Scheduled mechanized track possession for continuous action tamping and track geometrical alignment.'
  );

  const [conflictSimulated, setConflictSimulated] = useState(false);

  const steps = [
    { number: 1, title: 'Corridor & Alignment', desc: 'Line, KM range & work category' },
    { number: 2, title: 'Equipment & Gangs', desc: 'Machinery fitness & crew roster' },
    { number: 3, title: 'Possession Window', desc: 'Date, start time & duration' },
    { number: 4, title: 'Traction & Safety', desc: '25kV cutoff & caution orders' },
  ];

  const handleNext = () => {
    if (currentStep === 3) {
      // Simulate sweep-line conflict detection
      setConflictSimulated(true);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCorridor = DEMO_CORRIDORS.find((c) => c.code === corridorCode) || DEMO_CORRIDORS[0];

    const newBlock: Partial<Block> = {
      id: `blk-${Date.now()}`,
      block_code: `BLK-${departmentCode}-${corridorCode.substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
      corridor: selectedCorridor,
      line_type: lineType,
      department_code: departmentCode,
      work_type: workType,
      status: 'SUBMITTED',
      start_km: Number(startKm),
      end_km: Number(endKm),
      scheduled_start_time: `${requestDate}T${startTime}:00+05:30`,
      scheduled_end_time: `${requestDate}T05:00:00+05:30`,
      gang_id: selectedGang,
      equipment_required: selectedMachine,
      traction_power_cutoff_required: powerCutoffRequired,
      work_description: workDescription,
      version: 1,
    };

    if (onSuccess) {
      onSuccess(newBlock);
    }
  };

  return (
    <div className="bg-control-panel border border-control-border rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto">
      {/* Wizard Step Bar */}
      <div className="mb-8 border-b border-control-border pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Possession Proposal Protocol
            </span>
            <h2 className="text-lg font-extrabold text-white">
              Formulate Track Block Proposal ({departmentCode})
            </h2>
          </div>
          <span className="text-xs font-mono bg-control-bg px-3 py-1 rounded-full border border-control-border text-slate-300">
            Step {currentStep} of 4
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {steps.map((s) => (
            <div
              key={s.number}
              className={`p-2.5 rounded-xl border transition-all ${
                currentStep === s.number
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 ring-1 ring-cyan-400/40'
                  : currentStep > s.number
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                  : 'border-control-border bg-control-bg/40 text-control-muted'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                <span>STAGE 0{s.number}</span>
                {currentStep > s.number && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-xs font-bold font-sans text-white truncate">{s.title}</p>
              <p className="text-[10px] text-control-muted truncate hidden sm:block">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Corridor & Alignment */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Corridor Geographic Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Corridor Line Section</label>
                <select
                  value={corridorCode}
                  onChange={(e) => setCorridorCode(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                >
                  {DEMO_CORRIDORS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Track Line Orientation</label>
                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value as LineType)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="UP">UP Main Line (Toward NDLS)</option>
                  <option value="DOWN">DOWN Main Line (From NDLS)</option>
                  <option value="BOTH">Both Lines (Full Corridor Shutdown)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Start Kilometer (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={startKm}
                  onChange={(e) => setStartKm(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">End Kilometer (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={endKm}
                  onChange={(e) => setEndKm(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Total Linear Span</label>
                <div className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg/60 border border-control-border rounded-xl text-cyan-400 font-bold flex items-center justify-between">
                  <span>{(Math.max(0, endKm - startKm)).toFixed(2)} KM</span>
                  <span className="text-[10px] text-control-muted">TRACK SPAN</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Specific Work Designation</label>
              <input
                type="text"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                placeholder="e.g., Track Tamping (CSM) or 25kV Catenary Dropper Renewal"
                className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Equipment & Gangs */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Machinery Assignment & Fitness Certification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Required Track Machinery</label>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                >
                  {DEMO_MACHINERY.map((m) => (
                    <option key={m.machine_code} value={m.machine_code}>
                      {m.machine_code} — {m.name} ({m.fitness_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Assigned Maintenance Gang</label>
                <select
                  value={selectedGang}
                  onChange={(e) => setSelectedGang(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                >
                  {DEMO_GANGS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.supervisor_name}) — {g.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-control-border bg-control-bg/60 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-control-muted">Machine Fitness Expiry:</span>
                <span className="text-emerald-400 font-bold">2026-12-31 (VALID FIT)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-control-muted">Gang Safety Compliance:</span>
                <span className="text-cyan-400 font-bold">IR Level 3 Track Machine Operator</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-control-muted">Supervisor Hotline:</span>
                <span className="text-slate-300">+91 98712-44321</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Temporal Window */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Temporal Possession Window Request
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Possession Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Requested Start Time (IST)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  step="15"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Safety Buffer Margin (Minutes)</label>
                <input
                  type="number"
                  step="5"
                  value={bufferMarginMinutes}
                  onChange={(e) => setBufferMarginMinutes(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 text-xs font-mono text-cyan-300 flex items-center justify-between">
              <span>Total Track Occupancy Required:</span>
              <strong className="text-white text-sm">{durationMinutes + bufferMarginMinutes} minutes ({( (durationMinutes + bufferMarginMinutes) / 60 ).toFixed(1)} hrs)</strong>
            </div>
          </div>
        )}

        {/* STEP 4: Traction & Safety */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Traction Power Cutoff & Caution Orders
            </h3>

            {/* Power Cutoff Toggle */}
            <div className="p-4 rounded-xl border border-control-border bg-control-bg/80 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  25kV AC Traction Power Shutdown Required
                </h4>
                <p className="text-[11px] text-control-muted mt-0.5">
                  Requires Power Controller (TRD) permit-to-work and earth discharge rods.
                </p>
              </div>
              <input
                type="checkbox"
                checked={powerCutoffRequired}
                onChange={(e) => setPowerCutoffRequired(e.target.checked)}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Caution Speed & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Caution Order Speed Cap (km/h)
                </label>
                <input
                  type="number"
                  value={cautionSpeedKmh}
                  onChange={(e) => setCautionSpeedKmh(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Adjacent Line Protection Protocol
                </label>
                <div className="p-2.5 bg-control-bg rounded-xl border border-control-border flex items-center gap-2 text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={adjacentLineProtection}
                    onChange={(e) => setAdjacentLineProtection(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <span>Enforce red banner flags & detonators</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                Engineering Work Narrative & Operational Justification
              </label>
              <textarea
                rows={3}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-control-bg border border-control-border rounded-xl text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* AI Pre-Validation Summary */}
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-xs font-mono text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                HermiT DL Pre-Check: Block parameters are syntactically valid and conflict-free for proposed window.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="border-t border-control-border pt-4 flex items-center justify-between">
          <div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl border border-control-border text-control-muted hover:text-white text-xs font-mono transition"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl border border-control-border text-white text-xs font-mono hover:bg-control-bg transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-900/50"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-900/50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Proposal for SSE Signoff</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
