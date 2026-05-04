import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function invokeOrThrow(fn: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message ?? `Erreur ${fn}`);
  if (data && typeof data === 'object' && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data;
}

export function usePartnerMutations(workspaceId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['workspace_partners', workspaceId] });
    qc.invalidateQueries({ queryKey: ['partner_invitations', workspaceId] });
  };

  const revokePartnerInvitation = useMutation({
    mutationFn: async (invitation_id: string) =>
      invokeOrThrow('revoke-partner-invitation', { invitation_id }),
    onSuccess: () => { toast.success('Invitation révoquée'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendPartner = useMutation({
    mutationFn: async (partner_id: string) => invokeOrThrow('suspend-partner', { partner_id }),
    onSuccess: () => { toast.success('Partenaire suspendu'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivatePartner = useMutation({
    mutationFn: async (partner_id: string) => invokeOrThrow('reactivate-partner', { partner_id }),
    onSuccess: () => { toast.success('Partenaire réactivé'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePartnerScope = useMutation({
    mutationFn: async ({ partner_id, scope }: { partner_id: string; scope: Record<string, boolean> }) =>
      invokeOrThrow('update-partner-scope', { partner_id, scope }),
    onSuccess: () => { toast.success('Visibilité mise à jour'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { revokePartnerInvitation, suspendPartner, reactivatePartner, updatePartnerScope };
}
