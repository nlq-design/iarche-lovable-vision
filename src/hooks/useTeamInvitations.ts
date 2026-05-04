import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  token: string;
  expires_at: string;
  created_at: string;
  invited_by: string | null;
  inviter_name: string | null;
}

export function useTeamInvitations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['team_invitations', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('id, email, role, token, expires_at, created_at, invited_by')
        .eq('workspace_id', workspaceId!)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as any[];
      if (list.length === 0) return [];

      const inviterIds = Array.from(new Set(list.map((i) => i.invited_by).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('owner_profile')
          .select('user_id, display_name')
          .in('user_id', inviterIds);
        nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
      }

      return list.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expires_at: i.expires_at,
        created_at: i.created_at,
        invited_by: i.invited_by,
        inviter_name: i.invited_by ? nameMap.get(i.invited_by) ?? null : null,
      }));
    },
  });
}
