import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PartnerInvitation = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  partner_id: string;
  partner_name: string | null;
};

export function usePartnerInvitations(workspaceId: string | null) {
  return useQuery<PartnerInvitation[]>({
    queryKey: ['partner_invitations', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_invitations')
        .select('id, email, token, expires_at, partner_id, partners!inner(name, workspace_id)')
        .is('accepted_at', null)
        .eq('partners.workspace_id', workspaceId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        token: r.token,
        expires_at: r.expires_at,
        partner_id: r.partner_id,
        partner_name: r.partners?.name ?? null,
      }));
    },
  });
}
