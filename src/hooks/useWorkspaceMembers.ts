import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceMember {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'suspended';
  suspended_at: string | null;
  joined_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace_members', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('user_id, role, status, suspended_at, joined_at')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      const list = (members ?? []) as any[];
      if (list.length === 0) return [];

      const userIds = list.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('owner_profile')
        .select('user_id, display_name, avatar_url, email')
        .in('user_id', userIds);

      const profileMap = new Map<string, any>(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      return list.map((m) => {
        const p = profileMap.get(m.user_id) ?? {};
        return {
          user_id: m.user_id,
          role: m.role,
          status: (m.status ?? 'active') as 'active' | 'suspended',
          suspended_at: m.suspended_at ?? null,
          joined_at: m.joined_at ?? null,
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          email: p.email ?? null,
        };
      });
    },
  });
}
