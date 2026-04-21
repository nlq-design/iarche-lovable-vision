import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export type WorkspaceContextValue = {
  currentWorkspaceId: string | null;
  workspaces: Array<{ workspace_id: string; role: WorkspaceRole }>;
  loading: boolean;
  error: string | null;
  switchWorkspace: (workspace_id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ workspace_id: string; role: WorkspaceRole }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCurrentWorkspaceId(null);
      setWorkspaces([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .then(({ data, error: dbErr }) => {
        if (dbErr) {
          setError(dbErr.message);
          setLoading(false);
          return;
        }
        const list = (data ?? []) as Array<{ workspace_id: string; role: WorkspaceRole }>;
        setWorkspaces(list);
        const stored = localStorage.getItem('iarche_active_workspace');
        const resolved =
          (stored && list.find((w) => w.workspace_id === stored)?.workspace_id) ||
          list[0]?.workspace_id ||
          (import.meta.env.DEV ? DEFAULT_WORKSPACE_ID : null);
        if (resolved === DEFAULT_WORKSPACE_ID && import.meta.env.DEV) {
          console.warn(
            '[WorkspaceProvider] DEV fallback to DEFAULT_WORKSPACE_ID — no workspace membership found for user',
            user.id
          );
        }
        setCurrentWorkspaceId(resolved);
        setError(null);
        setLoading(false);
      });
  }, [user, authLoading]);

  const switchWorkspace = (id: string) => {
    setCurrentWorkspaceId(id);
    localStorage.setItem('iarche_active_workspace', id);
  };

  return (
    <WorkspaceContext.Provider
      value={{ currentWorkspaceId, workspaces, loading, error, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (ctx === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
};

export const useWorkspaceId = (): string | null => useWorkspace().currentWorkspaceId;
