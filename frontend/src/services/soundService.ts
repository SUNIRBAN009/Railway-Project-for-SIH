/**
 * Indian Railways Multi-Department Audio Chime & Acoustic Telemetry Service
 * Pure Web Audio API synthesis - zero external audio dependencies.
 */

import { useSocketStore } from '../stores/socketStore';

let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

/**
 * Play a synthesized tone with customizable frequency, duration, waveform and envelope
 */
const playTone = (
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain: number = 0.2
) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration + 0.05);
  } catch (err) {
    console.debug('[SoundService] Tone error:', err);
  }
};

/**
 * Distinct Department Chimes for Incoming Pending Queue Proposals
 */
export const playPendingProposalChime = (deptCode?: string) => {
  const isMuted = useSocketStore.getState().isAudioMuted;
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const dept = (deptCode || '').toUpperCase();

  if (dept === 'TRD') {
    // TRD (Traction / Electrical): Electric dual-pulse chime (High-frequency resonance)
    playTone(ctx, 880.0, 0, 0.18, 'sine', 0.25);      // A5
    playTone(ctx, 1318.5, 0.16, 0.35, 'triangle', 0.22); // E6
    playTone(ctx, 1760.0, 0.18, 0.25, 'sine', 0.12); // A6 overtone
  } else if (dept === 'ENG') {
    // ENG (P-Way / Engineering): Solid acoustic mechanical tone (Industrial rail timbre)
    playTone(ctx, 329.63, 0, 0.25, 'triangle', 0.3); // E4
    playTone(ctx, 440.0, 0.18, 0.3, 'sine', 0.25);   // A4
    playTone(ctx, 659.25, 0.35, 0.45, 'sine', 0.2);  // E5
  } else if (dept === 'SNT') {
    // SNT (Signal & Telecom): Digital interlocking staccato triple-pip
    playTone(ctx, 659.25, 0, 0.12, 'sine', 0.22);    // E5
    playTone(ctx, 783.99, 0.12, 0.12, 'sine', 0.22);  // G5
    playTone(ctx, 1046.5, 0.24, 0.3, 'sine', 0.25);   // C6
  } else {
    // Default / Operations incoming proposal
    playTone(ctx, 523.25, 0, 0.2, 'sine', 0.2);       // C5
    playTone(ctx, 783.99, 0.18, 0.35, 'sine', 0.22);  // G5
  }
};

/**
 * Distinct Audio Chimes for General Notifications (CRITICAL, ALERT, WARNING, INFO)
 */
export const playNotificationChime = (priority?: string, deptCode?: string) => {
  const isMuted = useSocketStore.getState().isAudioMuted;
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const prio = (priority || '').toUpperCase();

  if (prio === 'CRITICAL_ALARM' || prio === 'EMERGENCY') {
    // Urgent alarm warble
    playTone(ctx, 880, 0, 0.15, 'sawtooth', 0.3);
    playTone(ctx, 1174, 0.15, 0.25, 'sawtooth', 0.3);
    playTone(ctx, 880, 0.38, 0.15, 'sawtooth', 0.3);
    playTone(ctx, 1174, 0.53, 0.3, 'sawtooth', 0.3);
  } else if (prio === 'OPERATIONAL_ALERT') {
    // Alert chime
    playTone(ctx, 587.33, 0, 0.2, 'triangle', 0.25);
    playTone(ctx, 880.0, 0.18, 0.35, 'sine', 0.25);
  } else if (prio === 'SAFETY_WARNING') {
    // Warning tone
    playTone(ctx, 440.0, 0, 0.22, 'sine', 0.25);
    playTone(ctx, 554.37, 0.2, 0.35, 'sine', 0.25);
  } else {
    // Routine Info / Confirmation
    if (deptCode) {
      playPendingProposalChime(deptCode);
    } else {
      playTone(ctx, 523.25, 0, 0.18, 'sine', 0.18);
      playTone(ctx, 659.25, 0.15, 0.25, 'sine', 0.2);
    }
  }
};
