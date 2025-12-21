import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SolutionLead {
  id: string;
  solution_id: string;
  lead_id: string;
  interest_level: string | null;
  notes: string | null;
  created_at: string | null;
}

interface SolutionLeadWithDetails extends SolutionLead {
  lead?: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
  };
}

export function useCockpitSolutionLeads(solutionId?: string) {
  const queryClient = useQueryClient();

  // Fetch leads linked to a specific solution
  const { data: solutionLeads = [], isLoading, refetch } = useQuery({
    queryKey: ['solution-leads', solutionId],
    queryFn: async () => {
      if (!solutionId) return [];
      
      const { data, error } = await supabase
        .from('solution_leads')
        .select(`
          id,
          solution_id,
          lead_id,
          interest_level,
          notes,
          created_at
        `)
        .eq('solution_id', solutionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching solution leads:', error);
        return [];
      }

      // Fetch lead details separately
      if (data && data.length > 0) {
        const leadIds = data.map(sl => sl.lead_id);
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, email, company, phone')
          .in('id', leadIds);

        return data.map(sl => ({
          ...sl,
          lead: leads?.find(l => l.id === sl.lead_id)
        })) as SolutionLeadWithDetails[];
      }

      return data as SolutionLeadWithDetails[];
    },
    enabled: !!solutionId,
  });

  // Link a lead to a solution
  const linkLead = useMutation({
    mutationFn: async ({ 
      solutionId, 
      leadId, 
      interestLevel = 'interested',
      notes 
    }: { 
      solutionId: string; 
      leadId: string; 
      interestLevel?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('solution_leads')
        .insert({
          solution_id: solutionId,
          lead_id: leadId,
          interest_level: interestLevel,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution-leads'] });
      toast.success('Lead lié à la solution');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Ce lead est déjà lié à cette solution');
      } else {
        toast.error('Erreur lors de la liaison');
      }
    },
  });

  // Unlink a lead from a solution
  const unlinkLead = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('solution_leads')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution-leads'] });
      toast.success('Lead retiré de la solution');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Update interest level or notes
  const updateLink = useMutation({
    mutationFn: async ({ 
      linkId, 
      interestLevel, 
      notes 
    }: { 
      linkId: string; 
      interestLevel?: string; 
      notes?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (interestLevel !== undefined) updates.interest_level = interestLevel;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from('solution_leads')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution-leads'] });
      toast.success('Mise à jour effectuée');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Get count of leads per solution (for list view)
  const { data: solutionLeadCounts = {} } = useQuery({
    queryKey: ['solution-leads-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solution_leads')
        .select('solution_id');

      if (error || !data) return {};

      const counts: Record<string, number> = {};
      data.forEach(sl => {
        counts[sl.solution_id] = (counts[sl.solution_id] || 0) + 1;
      });
      return counts;
    },
  });

  return {
    solutionLeads,
    solutionLeadCounts,
    isLoading,
    refetch,
    linkLead,
    unlinkLead,
    updateLink,
  };
}
