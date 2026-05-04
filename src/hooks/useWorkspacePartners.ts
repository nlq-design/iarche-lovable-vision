import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type WorkspacePartner = {
  id: string;
  name: string;
  email: string | null;
  slug: string;
  partner_type: string;
  status: 'active' | 'suspended';
  is_active: boolean | null;
  scope: Record<string, boolean>;
  suspended_at: string | null;
  user_id: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export function useWorkspacePartners(workspaceId: string | null) {
  return useQuery<WorkspacePartner[]>({
    queryKey: ['workspace_partners', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, email, slug, partner_type, status, is_active, scope, suspended_at, user_id, avatar_url, created_at')
        .eq('workspace_id', workspaceId!)
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkspacePartner[];
    },
  });
}
