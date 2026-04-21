import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export interface OwnerProfile {
  id: string;
  user_id: string;
  workspace_id: string;
  display_name: string;
  role_label: string | null;
  avatar_url: string | null;
  email: string | null;
  primary_company_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OwnerProfileInput = {
  display_name: string;
  role_label?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  primary_company_id?: string | null;
};

const QUERY_KEY = ['owner-profile'];

export function useOwnerProfile(workspaceIdOverride?: string) {
  const { user } = useAuth();
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = workspaceIdOverride ?? ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;
  const queryClient = useQueryClient();

  const { data: ownerProfile, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, user?.id, workspaceId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('owner_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as OwnerProfile | null;
    },
    enabled: !!user?.id,
  });

  const createOwnerProfile = useMutation({
    mutationFn: async (input: OwnerProfileInput) => {
      if (!user?.id) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('owner_profile')
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          display_name: input.display_name,
          role_label: input.role_label ?? null,
          avatar_url: input.avatar_url ?? null,
          email: input.email ?? null,
          primary_company_id: input.primary_company_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OwnerProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Profil propriétaire créé');
    },
    onError: (e) => toast.error(`Erreur lors de la création : ${e.message}`),
  });

  const updateOwnerProfile = useMutation({
    mutationFn: async (input: Partial<OwnerProfileInput>) => {
      if (!user?.id) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('owner_profile')
        .update(input)
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .select()
        .single();
      if (error) throw error;
      return data as OwnerProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Profil propriétaire mis à jour');
    },
    onError: (e) => toast.error(`Erreur lors de la mise à jour : ${e.message}`),
  });

  const isOwner = (userId: string | null | undefined): boolean => {
    if (!userId || !ownerProfile) return false;
    return userId === ownerProfile.user_id;
  };

  const resolveOwner = (userId: string | null | undefined) => {
    if (!userId || !ownerProfile || userId !== ownerProfile.user_id) return null;
    return {
      display_name: ownerProfile.display_name,
      role_label: ownerProfile.role_label,
      avatar_url: ownerProfile.avatar_url,
    };
  };

  return {
    ownerProfile,
    isLoading,
    createOwnerProfile,
    updateOwnerProfile,
    isOwner,
    resolveOwner,
  };
}
