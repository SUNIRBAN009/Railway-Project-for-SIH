import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/api';
import { User } from '../../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, accessToken, logout: storeLogout, setAuth } = useAuthStore();

  useEffect(() => {
    // Validate session with backend on initial load if token exists
    if (accessToken && !user) {
      authService
        .getCurrentUser()
        .then((fetchedUser) => {
          setAuth(fetchedUser, accessToken);
        })
        .catch(() => {
          storeLogout();
        });
    }
  }, [accessToken, user, setAuth, storeLogout]);

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
