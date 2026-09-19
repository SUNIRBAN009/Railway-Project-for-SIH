import { create } from 'zustand';

export type SocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface EmergencyEvent {
  id: string;
  title: string;
  message: string;
  corridor: string;
  kmLocation?: number;
  priority: string;
  timestamp: string;
}

export interface SocketEventLog {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export interface LiveCorridorMetrics {
  punctuality: number;
  shadowGain: number;
  activeTrains: number;
  activePossessions: number;
  eventSequence: number;
}

interface SocketState {
  status: SocketStatus;
  latency: number;
  lastPingTime: number;
  reconnectAttempts: number;
  activeCorridor: string;
  emergencyAlert: EmergencyEvent | null;
  recentEvents: SocketEventLog[];
  liveMetrics: LiveCorridorMetrics;

  setStatus: (status: SocketStatus) => void;
  setLatency: (latency: number) => void;
  setReconnectAttempts: (attempts: number | ((prev: number) => number)) => void;
  setActiveCorridor: (corridor: string) => void;
  setEmergencyAlert: (alert: EmergencyEvent | null) => void;
  clearEmergencyAlert: () => void;
  addEvent: (type: string, payload: any) => void;
  setLiveMetrics: (metrics: Partial<LiveCorridorMetrics>) => void;
  triggerDemoEmergency: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'DISCONNECTED',
  latency: 18,
  lastPingTime: Date.now(),
  reconnectAttempts: 0,
  activeCorridor: 'NDLS-GZB',
  emergencyAlert: null,
  recentEvents: [],
  liveMetrics: {
    punctuality: 96.8,
    shadowGain: 42.5,
    activeTrains: 12,
    activePossessions: 8,
    eventSequence: 1,
  },

  setStatus: (status) => set({ status }),
  setLatency: (latency) => set({ latency }),
  setReconnectAttempts: (attempts) =>
    set((state) => ({
      reconnectAttempts: typeof attempts === 'function' ? attempts(state.reconnectAttempts) : attempts,
    })),
  setActiveCorridor: (activeCorridor) => set({ activeCorridor }),
  setEmergencyAlert: (emergencyAlert) => set({ emergencyAlert }),
  clearEmergencyAlert: () => set({ emergencyAlert: null }),
  addEvent: (type, payload) =>
    set((state) => ({
      recentEvents: [
        {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type,
          timestamp: new Date().toISOString(),
          payload,
        },
        ...state.recentEvents.slice(0, 49),
      ],
    })),
  setLiveMetrics: (metrics) =>
    set((state) => ({
      liveMetrics: { ...state.liveMetrics, ...metrics },
    })),
  triggerDemoEmergency: () =>
    set({
      emergencyAlert: {
        id: `emerg-${Date.now()}`,
        title: 'CRITICAL USFD RAIL FRACTURE DETECTED',
        message: 'Ultrasonic Flaw Detector (USFD) confirmed Transverse Fissure at KM 14.8 (DN Main, Sahibabad–Ghaziabad). Emergency track freeze activated.',
        corridor: 'NDLS-GZB',
        kmLocation: 14.8,
        priority: 'CRITICAL_ALARM',
        timestamp: new Date().toISOString(),
      },
    }),
}));
