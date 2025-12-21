import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export function useCockpitLeads() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all leads with cockpit-relevant fields
  const { data: leads, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });

  // Fetch leads by qualification status
  const useLeadsByStatus = (status: string) => {
    return useQuery({
      queryKey: ['cockpit-leads', 'status', status],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('qualification_status', status)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Lead[];
      },
    });
  };

  // Update lead
  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LeadUpdate }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-leads'] });
      toast({
        title: 'Lead mis à jour',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le lead',
        variant: 'destructive',
      });
      console.error('Update lead error:', error);
    },
  });

  // Update qualification status
  const updateQualificationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          qualification_status: status,
          last_contacted_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-leads'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le lead a été qualifié',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
      console.error('Update status error:', error);
    },
  });

  // Stats
  const stats = {
    total: leads?.length || 0,
    new: leads?.filter(l => l.qualification_status === 'new').length || 0,
    qualified: leads?.filter(l => l.qualification_status === 'qualified').length || 0,
    contacted: leads?.filter(l => l.qualification_status === 'contacted').length || 0,
    converted: leads?.filter(l => l.qualification_status === 'converted').length || 0,
    lost: leads?.filter(l => l.qualification_status === 'lost').length || 0,
  };

  return {
    leads,
    isLoading,
    error,
    refetch,
    stats,
    updateLead,
    updateQualificationStatus,
    useLeadsByStatus,
  };
}
