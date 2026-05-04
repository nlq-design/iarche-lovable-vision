import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Role = 'owner' | 'editor' | 'viewer';

async function invokeOrThrow(fn: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message ?? `Erreur ${fn}`);
  if (data && typeof data === 'object' && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data;
}

export function useTeamMutations(workspaceId: string | null) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['workspace_members', workspaceId] });
    qc.invalidateQueries({ queryKey: ['team_invitations', workspaceId] });
  };

  const inviteTeamMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      return invokeOrThrow('invite-team-member', { workspace_id: workspaceId, email, role });
    },
    onSuccess: (data: any) => {
      toast.success(data?.warning ? data.warning : 'Invitation envoyée');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitation_id: string) =>
      invokeOrThrow('revoke-team-invitation', { invitation_id }),
    onSuccess: () => {
      toast.success('Invitation révoquée');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeMemberRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: Role }) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      return invokeOrThrow('change-member-role', { workspace_id: workspaceId, user_id, role });
    },
    onSuccess: () => {
      toast.success('Rôle mis à jour');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendMember = useMutation({
    mutationFn: async (user_id: string) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      return invokeOrThrow('suspend-member', { workspace_id: workspaceId, user_id });
    },
    onSuccess: () => {
      toast.success('Membre suspendu');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMember = useMutation({
    mutationFn: async (user_id: string) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      return invokeOrThrow('reactivate-member', { workspace_id: workspaceId, user_id });
    },
    onSuccess: () => {
      toast.success('Membre réactivé');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (user_id: string) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      return invokeOrThrow('remove-member', { workspace_id: workspaceId, user_id });
    },
    onSuccess: () => {
      toast.success('Membre retiré');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    inviteTeamMember,
    revokeInvitation,
    changeMemberRole,
    suspendMember,
    reactivateMember,
    removeMember,
  };
}
