import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];

const PIPELINE_STAGES = ['lead', 'r1', 'r2', 'pause', 'closed_won', 'closed_lost'] as const;

export function useCockpitOpportunities(workspaceId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all opportunities
  const { data: opportunities, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-opportunities', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          leads:lead_id (id, name, email, company)
        `)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
  });

  // Fetch opportunities by stage
  const useOpportunitiesByStage = (stage: string) => {
    return useQuery({
      queryKey: ['cockpit-opportunities', 'stage', stage, workspaceId],
      queryFn: async () => {
        let query = supabase
          .from('opportunities')
          .select(`
            *,
            leads:lead_id (id, name, email, company)
          `)
          .eq('stage', stage)
          .order('created_at', { ascending: false });

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });
  };

  // Create opportunity
  const createOpportunity = useMutation({
    mutationFn: async (opportunity: OpportunityInsert) => {
      const { data, error } = await supabase
        .from('opportunities')
        .insert(opportunity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
      toast({
        title: 'Opportunité créée',
        description: 'L\'opportunité a été ajoutée au pipeline',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'opportunité',
        variant: 'destructive',
      });
      console.error('Create opportunity error:', error);
    },
  });

  // Update opportunity
  const updateOpportunity = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: OpportunityUpdate }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
      toast({
        title: 'Opportunité mise à jour',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'opportunité',
        variant: 'destructive',
      });
      console.error('Update opportunity error:', error);
    },
  });

  // Move to stage
  const moveToStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const updates: OpportunityUpdate = { stage };
      
      // Auto-set closed_at for terminal stages
      if (stage === 'closed_won' || stage === 'closed_lost') {
        updates.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
      toast({
        title: 'Pipeline mis à jour',
        description: `Opportunité déplacée vers ${data.stage}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de déplacer l\'opportunité',
        variant: 'destructive',
      });
      console.error('Move stage error:', error);
    },
  });

  // Delete opportunity
  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
      toast({
        title: 'Opportunité supprimée',
        description: 'L\'opportunité a été retirée du pipeline',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'opportunité',
        variant: 'destructive',
      });
      console.error('Delete opportunity error:', error);
    },
  });

  // Stats
  const stats = {
    total: opportunities?.length || 0,
    totalValue: opportunities?.reduce((sum, o) => sum + (Number(o.value_amount) || 0), 0) || 0,
    weightedValue: opportunities?.reduce((sum, o) => {
      const value = Number(o.value_amount) || 0;
      const probability = (o.probability || 50) / 100;
      return sum + (value * probability);
    }, 0) || 0,
    byStage: PIPELINE_STAGES.reduce((acc, stage) => {
      const stageOpps = opportunities?.filter(o => o.stage === stage) || [];
      acc[stage] = {
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + (Number(o.value_amount) || 0), 0),
      };
      return acc;
    }, {} as Record<string, { count: number; value: number }>),
  };

  return {
    opportunities,
    isLoading,
    error,
    refetch,
    stats,
    PIPELINE_STAGES,
    createOpportunity,
    updateOpportunity,
    moveToStage,
    deleteOpportunity,
    useOpportunitiesByStage,
  };
}
