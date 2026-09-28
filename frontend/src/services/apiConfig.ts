/**
 * Dynamic API & WebSocket configuration resolver.
 * Ensures 100% network portability:
 * - Works on localhost / 127.0.0.1
 * - Works from any other computer/mobile on the local WiFi/LAN (e.g. 192.168.x.x, 10.x.x.x)
 * - Works through Vite dev proxy (/api/v1) and production reverse proxies
 */

export const getApiBaseUrl = (): string => {
  // If running in browser, use relative URL prefix or current host on port 8000
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    // If accessed through Vite (port 3000), relative '/api/v1' routes through the proxy directly!
    return '';
  }
  return 'http://127.0.0.1:8000';
};

export const getWsBaseUrl = (corridorCode: string = 'NDLS-GZB'): string => {
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running through standard ports, empty port, or reverse proxy (Nginx port 80/443 or Vite dev 3000)
    if (!window.location.port || window.location.port === '80' || window.location.port === '443' || window.location.port === '3000') {
      return `${proto}//${window.location.host}/ws/corridor/${corridorCode}/`;
    }
    const host = window.location.hostname || 'localhost';
    return `${proto}//${host}:8001/ws/corridor/${corridorCode}/`;
  }
  return `ws://localhost:8001/ws/corridor/${corridorCode}/`;
};
