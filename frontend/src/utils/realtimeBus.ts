// Cross-tab real-time communication bus using standard BroadcastChannel API
export const REALTIME_BUS_NAME = 'railway_realtime_bus';

export const broadcastRealtimeEvent = (type: string, payload: any = {}) => {
  if (typeof window === 'undefined') return;

  // 1. Same-window custom event dispatch
  try {
    window.dispatchEvent(new CustomEvent('corridor_block_updated', { detail: payload }));
  } catch {}

  // 2. Cross-tab BroadcastChannel dispatch
  if ('BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(REALTIME_BUS_NAME);
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
};
