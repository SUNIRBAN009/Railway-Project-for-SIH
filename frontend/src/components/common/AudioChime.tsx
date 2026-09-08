import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSocketStore } from '../../stores/socketStore';
import { Volume2, VolumeX, BellRing } from 'lucide-react';

interface AudioChimeProps {
  showToggle?: boolean;
}

export const AudioChime: React.FC<AudioChimeProps> = ({ showToggle = false }) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const emergencyAlert = useSocketStore((state) => state.emergencyAlert);
  const lastAlertIdRef = useRef<string | null>(null);

  // Initialize or resume AudioContext on user interaction
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Synthesize Indian Railways 4-Tone Station Announcement Chime (F4 - A4 - C5 - F5)
  const playStationChime = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 349.23, start: 0, duration: 0.3 },   // F4
        { freq: 440.00, start: 0.28, duration: 0.3 }, // A4
        { freq: 523.25, start: 0.56, duration: 0.35 },// C5
        { freq: 698.46, start: 0.88, duration: 0.6 }, // F5
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        // Smooth bell-like envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      });
    } catch (err) {
      console.warn('[AudioChime] Web Audio playback error:', err);
    }
  }, [isMuted, getAudioContext]);

  // Synthesize High-Priority Dual-Tone Railway Emergency Siren (880Hz / 587Hz)
  const playEmergencySiren = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const sirenPulses = [
        { freq: 880, start: 0, duration: 0.22 },
        { freq: 587.33, start: 0.22, duration: 0.22 },
        { freq: 880, start: 0.44, duration: 0.22 },
        { freq: 587.33, start: 0.66, duration: 0.35 },
      ];

      sirenPulses.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      });
    } catch (err) {
      console.warn('[AudioChime] Emergency siren synthesis error:', err);
    }
  }, [isMuted, getAudioContext]);

  // Auto-play emergency siren whenever a new emergency alert arrives
  useEffect(() => {
    if (emergencyAlert && emergencyAlert.id !== lastAlertIdRef.current) {
      lastAlertIdRef.current = emergencyAlert.id;
      playEmergencySiren();
    }
  }, [emergencyAlert, playEmergencySiren]);

  if (!showToggle) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => {
          setIsMuted(!isMuted);
          if (isMuted) {
            getAudioContext();
          }
        }}
        title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
        className={`p-2 rounded-lg border transition ${
          isMuted
            ? 'border-slate-700 bg-slate-800 text-control-muted hover:text-white'
            : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-400 hover:border-cyan-500'
        }`}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <button
        onClick={playStationChime}
        title="Test Railway Station Chime"
        className="p-2 rounded-lg border border-control-border bg-control-bg text-control-muted hover:text-cyan-300 hover:border-slate-600 transition"
      >
        <BellRing className="w-4 h-4" />
      </button>
    </div>
  );
};
