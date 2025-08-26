import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/store/authStore';
import { authService } from '@/services/authService';

interface AuthContextType {
  // Context methods can be added here if needed
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, accessToken, setAuth, logout, setLoading } = useAuth();

  const checkAuthStatus = async () => {
    if (!accessToken || !isAuthenticated) {
      return;
    }

    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      // User is still valid, no need to update auth state
      // The store already has the current user
    } catch (error) {
      console.log('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const contextValue: AuthContextType = {
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};