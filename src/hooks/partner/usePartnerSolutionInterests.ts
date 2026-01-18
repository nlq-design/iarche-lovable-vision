import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SolutionInterest {
  id: string;
  partner_id: string;
  solution_id: string;
  client_name: string | null;
  client_email: string | null;
  client_company: string | null;
  notes: string | null;
  status: 'pending' | 'contacted' | 'converted' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface CreateSolutionInterestInput {
  solution_id: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  notes?: string;
}

export function usePartnerSolutionInterests() {
  return useQuery({
    queryKey: ['partner-solution-interests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_solution_interests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SolutionInterest[];
    },
  });
}

export function useCreateSolutionInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSolutionInterestInput) => {
      // Get current partner ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (partnerError || !partner) throw new Error('Partenaire non trouvé');

      const { data, error } = await supabase
        .from('partner_solution_interests')
        .insert({
          partner_id: partner.id,
          solution_id: input.solution_id,
          client_name: input.client_name || null,
          client_email: input.client_email || null,
          client_company: input.client_company || null,
          notes: input.notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-solution-interests'] });
    },
  });
}
