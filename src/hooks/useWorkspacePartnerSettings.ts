import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DigestDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WorkspacePartnerSettings = {
  workspace_id: string;
  digest_enabled: boolean;
  digest_day: DigestDay;
};

const DEFAULT: Omit<WorkspacePartnerSettings, 'workspace_id'> = {
  digest_enabled: false,
  digest_day: 'monday',
};

export function useWorkspacePartnerSettings(workspaceId: string | null) {
  const qc = useQueryClient();

  const query = useQuery<WorkspacePartnerSettings>({
    queryKey: ['workspace_partner_settings', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_partner_settings')
        .select('workspace_id, digest_enabled, digest_day')
        .eq('workspace_id', workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspacePartnerSettings) ?? { workspace_id: workspaceId!, ...DEFAULT };
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Omit<WorkspacePartnerSettings, 'workspace_id'>>) => {
      if (!workspaceId) throw new Error('Workspace non identifié');
      const merged = { ...(query.data ?? { workspace_id: workspaceId, ...DEFAULT }), ...patch, workspace_id: workspaceId };
      const { error } = await supabase
        .from('workspace_partner_settings')
        .upsert(merged, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Préférences enregistrées');
      qc.invalidateQueries({ queryKey: ['workspace_partner_settings', workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, upsert };
}
