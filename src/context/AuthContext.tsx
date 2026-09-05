import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GovernmentEmployee, LoginCredentials, AuthResponse } from '../types';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: GovernmentEmployee | null;
  isAuthenticated: boolean;
  loading: boolean;
  isConfigured: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  resetPassword: (employeeIdOrEmail: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GovernmentEmployee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = authService.isConfigured();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const sessionUser = await authService.getCurrentSession();
        if (mounted) {
          setUser(sessionUser);
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen to real-time auth changes if Supabase is active
    let subscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const sessionUser = await authService.getCurrentSession();
          if (mounted) setUser(sessionUser);
        } else {
          if (mounted) setUser(null);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.success && response.user) {
        setUser(response.user);
      }
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (employeeIdOrEmail: string) => {
    return await authService.resetPassword(employeeIdOrEmail);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        isConfigured,
        login,
        logout,
        resetPassword
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
