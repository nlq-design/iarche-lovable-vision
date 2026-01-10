import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Vivier {
  id: string;
  external_id?: string | null;
  source: string;
  source_file?: string | null;
  batch_id?: string | null;
  company_name?: string | null;
  siret?: string | null;
  siren?: string | null;
  naf_code?: string | null;
  legal_form?: string | null;
  contact_name?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_position?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  industry?: string | null;
  company_size?: string | null;
  revenue_range?: string | null;
  employee_count?: number | null;
  creation_date?: string | null;
  cold_score?: number | null;
  scoring_criteria?: Json | null;
  tags?: string[] | null;
  status?: string | null;
  promoted_to_lead_id?: string | null;
  promoted_at?: string | null;
  consent_marketing?: boolean | null;
  unsubscribed_at?: string | null;
  raw_data?: Json | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  workspace_id?: string | null;
}

export type VivierStatus = 'new' | 'scoring' | 'qualified' | 'contacted' | 'promoted' | 'unsubscribed';

export const VIVIER_STATUSES: Record<VivierStatus, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-slate-500' },
  scoring: { label: 'En scoring', color: 'bg-blue-500' },
  qualified: { label: 'Qualifié', color: 'bg-green-500' },
  contacted: { label: 'Contacté', color: 'bg-purple-500' },
  promoted: { label: 'Promu', color: 'bg-emerald-500' },
  unsubscribed: { label: 'Désabonné', color: 'bg-red-500' },
};

interface UseViviersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
}

export function useViviers(options: UseViviersOptions = {}) {
  const { page = 1, pageSize = 25, search, status, minScore, maxScore } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['viviers', page, pageSize, search, status, minScore, maxScore],
    queryFn: async () => {
      let query = supabase
        .from('viviers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Search filter
      if (search) {
        query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
      }

      // Status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Score filters
      if (minScore !== undefined) {
        query = query.gte('cold_score', minScore);
      }
      if (maxScore !== undefined) {
        query = query.lte('cold_score', maxScore);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        viviers: data as Vivier[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['viviers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viviers')
        .select('status, cold_score, promoted_at');

      if (error) throw error;

      const viviers = data || [];
      return {
        totalLeads: viviers.length,
        pendingScoring: viviers.filter(v => !v.cold_score && v.status !== 'promoted').length,
        qualified: viviers.filter(v => (v.cold_score || 0) >= 60).length,
        promoted: viviers.filter(v => v.promoted_at).length,
      };
    },
  });

  // Create mutation
  const createVivier = useMutation({
    mutationFn: async (vivier: Partial<Vivier>) => {
      const { id, ...rest } = vivier;
      const insertData = { ...rest, source: vivier.source || 'manual' };
      
      const { data, error } = await supabase
        .from('viviers')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success('Lead vivier créé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Bulk create mutation
  const bulkCreateViviers = useMutation({
    mutationFn: async (viviers: Partial<Vivier>[]) => {
      const toInsert = viviers.map(v => {
        const { id, ...rest } = v;
        return {
          ...rest,
          source: v.source || 'import',
          status: 'new',
        };
      });

      const { data, error } = await supabase
        .from('viviers')
        .insert(toInsert as any)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success(`${data.length} leads importés`);
    },
    onError: (error) => {
      toast.error(`Erreur d'import: ${error.message}`);
    },
  });

  // Update mutation
  const updateVivier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vivier> & { id: string }) => {
      const updateData = { ...updates, updated_at: new Date().toISOString() };
      
      const { data, error } = await supabase
        .from('viviers')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      toast.success('Lead vivier mis à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteVivier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('viviers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success('Lead vivier supprimé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Bulk delete
  const bulkDeleteViviers = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('viviers')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success(`${ids.length} leads supprimés`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    viviers: data?.viviers || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    stats: stats || { totalLeads: 0, pendingScoring: 0, qualified: 0, promoted: 0 },
    isLoading,
    error,
    refetch,
    createVivier,
    bulkCreateViviers,
    updateVivier,
    deleteVivier,
    bulkDeleteViviers,
  };
}

// Hook for single vivier
export function useVivier(id: string | null) {
  return useQuery({
    queryKey: ['vivier', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('viviers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Vivier | null;
    },
    enabled: !!id,
  });
}
