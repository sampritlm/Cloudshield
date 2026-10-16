import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAdmin: boolean;
  isAnalystOrAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cloudshield_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cloudshield_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyExistingAuth = async () => {
      const storedToken = localStorage.getItem('cloudshield_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('cloudshield_user', JSON.stringify(profile));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyExistingAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await api.login(email, password);
    setToken(resp.access_token);
    setUser(resp.user);
    localStorage.setItem('cloudshield_token', resp.access_token);
    localStorage.setItem('cloudshield_user', JSON.stringify(resp.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cloudshield_token');
    localStorage.removeItem('cloudshield_user');
  };

  const isAdmin = user?.role === 'admin';
  const isAnalystOrAdmin = user?.role === 'admin' || user?.role === 'analyst';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin,
        isAnalystOrAdmin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
