import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const stored = localStorage.getItem('nexus_user');
const storedToken = localStorage.getItem('nexus_token');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(stored ? JSON.parse(stored) : null);
  const [token, setToken] = useState<string | null>(storedToken);

  const login = useCallback(async (identifier: string, password: string) => {
    const res: any = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: { email: string; username: string; displayName: string; password: string }) => {
    const res: any = await api.post('/auth/register', data);
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
