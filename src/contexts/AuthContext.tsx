import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  hasWorkspace: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const stored = localStorage.getItem('nexus_user');
const storedToken = localStorage.getItem('nexus_token');
const storedHasWorkspace = localStorage.getItem('nexus_has_workspace') === 'true';

const INVITE_TOKEN_KEY = 'nexus_pending_invite';

async function consumePendingInvite() {
  const token = sessionStorage.getItem(INVITE_TOKEN_KEY);
  if (!token) return;
  try {
    await api.post(`/invites/${token}/accept`);
  } catch {
    // ignore — user may already be a member
  }
  sessionStorage.removeItem(INVITE_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(stored ? JSON.parse(stored) : null);
  const [token, setToken] = useState<string | null>(storedToken);
  const [hasWorkspace, setHasWorkspace] = useState(storedHasWorkspace);

  const login = useCallback(async (identifier: string, password: string) => {
    const res: any = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('nexus_token', res.token);
    localStorage.setItem('nexus_user', JSON.stringify(res.user));
    localStorage.setItem('nexus_has_workspace', String(res.hasWorkspace ?? false));
    setToken(res.token);
    setUser(res.user);
    setHasWorkspace(res.hasWorkspace ?? false);
    await consumePendingInvite();
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      username: string;
      displayName: string;
      password: string;
    }) => {
      const res: any = await api.post('/auth/register', data);
      localStorage.setItem('nexus_token', res.token);
      localStorage.setItem('nexus_user', JSON.stringify(res.user));
      localStorage.setItem('nexus_has_workspace', 'false');
      setToken(res.token);
      setUser(res.user);
      setHasWorkspace(false);
      await consumePendingInvite();
    },
    [],
  );

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_has_workspace');
    setToken(null);
    setUser(null);
    setHasWorkspace(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, hasWorkspace, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
