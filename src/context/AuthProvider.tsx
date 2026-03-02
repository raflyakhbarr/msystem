import React, { useState, useEffect, type ReactNode } from 'react';
import { authManager } from './AuthManager';
import { AuthContext } from './AuthContext';
import type { UserData, AuthContextType } from '../types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState(() => authManager.getState());

  useEffect(() => {
    const unsubscribe = authManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const login = (username: string, password: string, token: string, user: UserData, tokenExpiry?: string | null) => {
    authManager.setAuth(token, user, username, password, tokenExpiry || null);
    authManager.clearLegacyStorage();
  };

  const logout = () => {
    authManager.clearAuth();
  };

  const value: AuthContextType = {
    token: state.token,
    user: state.user,
    isAuthenticated: !!state.token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
