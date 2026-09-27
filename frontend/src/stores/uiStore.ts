import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  notificationsOpen: boolean;
  activeModal: string | null;
  theme: 'dark' | 'light';

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleNotifications: () => void;
  setNotificationsOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  try {
    const saved = localStorage.getItem('railway_theme');
    if (saved === 'light' || saved === 'dark') {
      if (typeof document !== 'undefined') {
        if (saved === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return saved;
    }
  } catch {}
  return 'dark';
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationsOpen: false,
  activeModal: null,
  theme: getInitialTheme(),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      try {
        localStorage.setItem('railway_theme', nextTheme);
      } catch {}
      return { theme: nextTheme };
    }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('railway_theme', theme);
    } catch {}
    set({ theme });
  },
}));
