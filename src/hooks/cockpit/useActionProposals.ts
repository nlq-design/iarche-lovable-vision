import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActionProposal {
  id: string;
  workspace_id: string;
  user_id: string | null;
  status: string;
  action_type: string;
  action_label: string;
  action_payload: Record<string, unknown>;
  ai_reasoning: string | null;
  validation_notes: string | null;
  executed_at: string | null;
  executed_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useActionProposals(workspaceId?: string) {
  const queryClient = useQueryClient();

  const proposals = useQuery({
    queryKey: ['action-proposals', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('action_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActionProposal[];
    },
    enabled: true,
  });

  const pendingProposals = proposals.data?.filter(p => p.status === 'pending') || [];
  const executedProposals = proposals.data?.filter(p => p.status === 'executed') || [];
  const rejectedProposals = proposals.data?.filter(p => p.status === 'rejected') || [];

  const validateAction = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      // Execute the action via edge function
      const { data, error } = await supabase.functions.invoke('execute-action-proposal', {
        body: { proposal_id: id, validation_notes: notes },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-proposals'] });
      toast.success('Action exécutée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const rejectAction = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('action_proposals')
        .update({
          status: 'rejected',
          validation_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-proposals'] });
      toast.success('Action rejetée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    proposals: proposals.data || [],
    pendingProposals,
    executedProposals,
    rejectedProposals,
    isLoading: proposals.isLoading,
    validateAction,
    rejectAction,
    refetch: proposals.refetch,
  };
}
