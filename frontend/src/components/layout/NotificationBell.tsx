import React from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

export const NotificationBell: React.FC = () => {
  const { toggleNotifications, notificationsOpen } = useUIStore();

  const { isAuthenticated } = useAuthStore();

  const { data: unreadCount = 0, refetch } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        return await notificationService.getUnreadCount();
      } catch {
        return 0;
      }
    },
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      refetch();
    };
    window.addEventListener('notification_received', handleUpdate);
    window.addEventListener('corridor_block_updated', handleUpdate);
    return () => {
      window.removeEventListener('notification_received', handleUpdate);
      window.removeEventListener('corridor_block_updated', handleUpdate);
    };
  }, [refetch]);

  return (
    <button
      type="button"
      onClick={toggleNotifications}
      aria-label="Toggle Operational Notifications Panel"
      className={`relative p-2 rounded-lg border transition-all duration-200 ${
        notificationsOpen
          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/50'
          : 'bg-control-bg/80 border-control-border text-control-muted hover:text-white hover:border-slate-600'
      }`}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold font-mono text-white shadow-lg shadow-rose-900/50 animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
