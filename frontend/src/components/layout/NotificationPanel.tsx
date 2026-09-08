import React, { useState } from 'react';
import { X, CheckCheck, AlertTriangle, Flame, AlertCircle, Info, Clock } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';

export interface OperationalNotification {
  id: string;
  title: string;
  message: string;
  severity: 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: Date;
  department: string;
  corridor: string;
  isRead: boolean;
}

// Master demonstration notifications for Indian Railways block planning presentation
const INITIAL_DEMO_NOTIFICATIONS: OperationalNotification[] = [
  {
    id: 'notif-001',
    title: 'USFD Rail Flaw Detected (Emergency Containment)',
    message: 'Ultrasonic trolley USFD-NR-03 detected 4.8mm transverse rail crack at KM 14.8 (NDLS-GZB Up Line). Automated emergency possession proposal generated.',
    severity: 'EMERGENCY',
    timestamp: new Date(Date.now() - 4 * 60 * 1000), // 4 mins ago
    department: 'ENG',
    corridor: 'NDLS-GZB-UP',
    isRead: false,
  },
  {
    id: 'notif-002',
    title: 'Sweep-Line Conflict Detected (Rajdhani Express)',
    message: 'Proposed TRD OHE possession BLK-DEMO-TRD-001 intersects 12424 Dibrugarh Rajdhani at KM 15.2. Time-shift recommendation: 02:45 - 04:15.',
    severity: 'CRITICAL',
    timestamp: new Date(Date.now() - 18 * 60 * 1000), // 18 mins ago
    department: 'OPERATIONS',
    corridor: 'NDLS-GZB-UP',
    isRead: false,
  },
  {
    id: 'notif-003',
    title: 'Weather Advisory: Dense Fog Warning',
    message: 'Northern Railway Meteorological Cell issued dense fog warning between Ghaziabad and Aligarh. Automatic speed restriction cap: 60 km/h applied.',
    severity: 'WARNING',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
    department: 'OPERATIONS',
    corridor: 'GZB-ALJN-DN',
    isRead: false,
  },
  {
    id: 'notif-004',
    title: 'Shadow Block Opportunity Bundled',
    message: 'Signal & Telecom point machine possession BLK-DEMO-SNT-001 successfully bundled with ENG Track Tamping at Sahibabad (Efficiency +42.5%).',
    severity: 'INFO',
    timestamp: new Date(Date.now() - 90 * 60 * 1000), // 1.5 hours ago
    department: 'SNT',
    corridor: 'NDLS-GZB-UP',
    isRead: true,
  },
  {
    id: 'notif-005',
    title: 'Night Corridor Block Possession Sanctioned',
    message: 'Chief Controller sanctioned possession BLK-DEMO-ENG-001 for CSM-092 Tamper machine between KM 12.0 and 16.0 (01:30 - 04:30 IST).',
    severity: 'INFO',
    timestamp: new Date(Date.now() - 180 * 60 * 1000), // 3 hours ago
    department: 'ENG',
    corridor: 'NDLS-GZB-UP',
    isRead: true,
  },
];

export const NotificationPanel: React.FC = () => {
  const { notificationsOpen, setNotificationsOpen } = useUIStore();
  const [notifications, setNotifications] = useState<OperationalNotification[]>(INITIAL_DEMO_NOTIFICATIONS);

  if (!notificationsOpen) return null;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getSeverityBadge = (severity: OperationalNotification['severity']) => {
    switch (severity) {
      case 'EMERGENCY':
        return {
          icon: <Flame className="w-4 h-4 text-rose-400 animate-pulse" />,
          color: 'bg-rose-950/60 border-rose-500/60 text-rose-300',
          dot: 'bg-rose-500',
        };
      case 'CRITICAL':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          color: 'bg-rose-950/40 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-500',
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          color: 'bg-amber-950/40 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
        };
      case 'INFO':
      default:
        return {
          icon: <Info className="w-4 h-4 text-cyan-400" />,
          color: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300',
          dot: 'bg-cyan-400',
        };
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setNotificationsOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-control-panel border-l border-control-border flex flex-col shadow-2xl">
          {/* Panel Header */}
          <div className="p-5 border-b border-control-border bg-control-bg/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-base font-bold font-mono text-white tracking-wide">
                OPERATIONAL DISPATCH FEED
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/40">
                  {unreadCount} NEW
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-control-muted hover:text-cyan-400 hover:bg-control-border/40 transition"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setNotificationsOpen(false)}
                className="p-1.5 rounded-lg text-control-muted hover:text-white hover:bg-control-border/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-header telemetry */}
          <div className="px-5 py-2.5 bg-control-panel border-b border-control-border/60 text-xs font-mono text-control-muted flex items-center justify-between">
            <span>DAPHNE WEBSOCKET STREAM</span>
            <span className="text-emerald-400 font-bold">LIVE TELEMETRY</span>
          </div>

          {/* Notifications Scroll List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-control-muted font-mono text-sm">
                No active dispatch notifications.
              </div>
            ) : (
              notifications.map((n) => {
                const badge = getSeverityBadge(n.severity);
                return (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      n.isRead
                        ? 'bg-control-bg/40 border-control-border/60 opacity-75 hover:opacity-100'
                        : `${badge.color} shadow-lg shadow-black/40`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {badge.icon}
                        <span className="font-mono text-xs font-extrabold uppercase tracking-tight">
                          {n.severity} • {n.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-control-muted">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(n.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-white mb-1 leading-snug">{n.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-control-muted">
                      <span>Corridor: {n.corridor}</span>
                      {!n.isRead && (
                        <span className="text-cyan-400 font-bold hover:underline">Click to Acknowledge</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-control-border bg-control-bg/80 text-center">
            <p className="text-[11px] font-mono text-control-muted">
              Indian Railways Center for Railway Information Systems (CRIS)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
