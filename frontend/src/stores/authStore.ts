import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, DepartmentCode } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (user, accessToken, refreshToken) => {
        const isMock = !accessToken || accessToken.startsWith('mock-');
        set((state) => ({
          user,
          accessToken: isMock ? null : accessToken,
          refreshToken: refreshToken || state.refreshToken,
          isAuthenticated: !isMock,
          error: null,
          isLoading: false,
        }));
      },

      setAccessToken: (accessToken) => {
        const isMock = !accessToken || accessToken.startsWith('mock-');
        set({
          accessToken: isMock ? null : accessToken,
          isAuthenticated: !isMock,
        });
      },

      setError: (error) => set({ error, isLoading: false }),

      clearError: () => set({ error: null }),

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
        localStorage.removeItem('railway_auth_storage');
      },
    }),
    {
      name: 'railway_auth_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken && !state.accessToken.startsWith('mock-') ? state.accessToken : null,
        refreshToken: state.refreshToken,
        isAuthenticated: Boolean(state.isAuthenticated && state.accessToken && !state.accessToken.startsWith('mock-')),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.accessToken && state.accessToken.startsWith('mock-')) {
          state.accessToken = null;
          state.isAuthenticated = false;
        }
      },
    }
  )
);
