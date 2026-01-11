import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface VivierList {
  id: string;
  name: string;
  description: string | null;
  list_type: 'dynamic' | 'static';
  criteria_json: Json;
  static_vivier_ids: string[];
  lead_count: number;
  last_sync_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string | null;
}

interface CreateListInput {
  name: string;
  description?: string;
  list_type?: 'dynamic' | 'static';
  criteria_json?: Record<string, unknown>;
  static_vivier_ids?: string[];
  lead_count?: number;
}

export function useVivierLists() {
  const queryClient = useQueryClient();

  const { data: lists, isLoading, error, refetch } = useQuery({
    queryKey: ['vivier-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vivier_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VivierList[];
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
  });

  const createList = useMutation({
    mutationFn: async (input: CreateListInput) => {
      const { data, error } = await supabase
        .from('vivier_lists')
        .insert([{
          name: input.name,
          description: input.description,
          list_type: input.list_type || 'dynamic',
          criteria_json: (input.criteria_json || {}) as unknown as Json,
          static_vivier_ids: input.static_vivier_ids || [],
          lead_count: input.lead_count || 0,
          last_sync_at: new Date().toISOString(),
        }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-lists'] });
      toast.success('Liste créée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VivierList> & { id: string }) => {
      const { data, error } = await supabase
        .from('vivier_lists')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-lists'] });
      toast.success('Liste mise à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vivier_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-lists'] });
      toast.success('Liste supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const syncList = useMutation({
    mutationFn: async (list: VivierList) => {
      if (list.list_type !== 'dynamic' || !list.criteria_json) {
        return { count: list.lead_count };
      }

      const criteria = list.criteria_json as Record<string, unknown>;
      
      // Build count query with filters
      let query = supabase
        .from('viviers')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'promoted');

      // Apply dynamic filters
      if (criteria.search) {
        query = query.or(`company_name.ilike.%${criteria.search}%,contact_name.ilike.%${criteria.search}%,email.ilike.%${criteria.search}%`);
      }
      if (criteria.city) {
        query = query.ilike('city', `%${criteria.city}%`);
      }
      if (criteria.postalCode) {
        query = query.ilike('postal_code', `${criteria.postalCode}%`);
      }
      if (criteria.region) {
        query = query.ilike('region', `%${criteria.region}%`);
      }
      if (criteria.industry) {
        query = query.ilike('industry', `%${criteria.industry}%`);
      }
      if (criteria.minScore !== undefined) {
        query = query.gte('cold_score', criteria.minScore as number);
      }
      if (criteria.maxScore !== undefined) {
        query = query.lte('cold_score', criteria.maxScore as number);
      }
      if (criteria.status) {
        query = query.eq('status', criteria.status as string);
      }
      if (criteria.hasEmail === true) {
        query = query.not('email', 'is', null);
      }
      if (criteria.hasPhone === true) {
        query = query.not('phone', 'is', null);
      }
      if (criteria.hasSiret === true) {
        query = query.not('siret', 'is', null);
      }

      const { count, error } = await query;

      if (error) throw error;

      // Update list count
      await supabase
        .from('vivier_lists')
        .update({
          lead_count: count || 0,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', list.id);

      return { count: count || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vivier-lists'] });
      toast.success(`Liste synchronisée: ${data.count} leads`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    lists: lists || [],
    isLoading,
    error,
    refetch,
    createList,
    updateList,
    deleteList,
    syncList,
  };
}

export function useVivierList(id: string | null) {
  return useQuery({
    queryKey: ['vivier-list', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('vivier_lists')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as VivierList | null;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
  });
}
