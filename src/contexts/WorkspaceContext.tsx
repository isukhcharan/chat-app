import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Workspace } from '@/types';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  switchWorkspace: (ws: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const STORAGE_KEY = 'nexus_workspace_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data: any = await api.get('/workspaces');
      const list: Workspace[] = data || [];
      setWorkspaces(list);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = list.find((w) => w.id === savedId);
      const target = saved ?? list[0] ?? null;
      setCurrentWorkspace(target);
      if (target) localStorage.setItem(STORAGE_KEY, target.id);
    } catch {
      setWorkspaces([]);
      setCurrentWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspace = useCallback((ws: Workspace) => {
    setCurrentWorkspace(ws);
    localStorage.setItem(STORAGE_KEY, ws.id);
    // Notify the gateway so it joins the new workspace's rooms
    getSocket().emit('workspace:join', { workspaceId: ws.id });
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, loading, switchWorkspace, refreshWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
