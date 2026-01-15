import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { useVivierStats } from './useVivierStats';

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
  source?: string;
  city?: string;
  postalCode?: string;
  department?: string;
  industry?: string;
  companySize?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  // Column-level filters
  columnFilters?: {
    company?: string;
    contact?: string;
    email?: string;
    location?: string;
    industry?: string;
    siret?: string;
    scoreRange?: 'high' | 'medium' | 'low' | 'none';
    statusFilter?: string;
  };
}

export function useViviers(options: UseViviersOptions = {}) {
  const { 
    page = 1, 
    pageSize = 25, 
    search, 
    status, 
    minScore, 
    maxScore, 
    source,
    city, 
    postalCode, 
    department, 
    industry, 
    companySize, 
    hasEmail, 
    hasPhone,
    columnFilters,
  } = options;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['viviers', page, pageSize, search, status, minScore, maxScore, source, city, postalCode, department, industry, companySize, hasEmail, hasPhone, columnFilters],
    queryFn: async () => {
      // Select only columns needed for the list view (performance optimization)
      // Add siret and legal_form for column filters
      let query = supabase
        .from('viviers')
        .select('id, company_name, contact_name, contact_first_name, contact_last_name, email, phone, city, postal_code, industry, cold_score, status, created_at, siret, legal_form', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Search filter - using trigram indexes for fast ILIKE
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

      // Source filter
      if (source) {
        query = query.eq('source', source);
      }

      // City filter - use exact match for performance (selected from autocomplete)
      if (city) {
        query = query.eq('city', city);
      }

      // Postal code filter (prefix match for department filtering)
      if (postalCode) {
        query = query.ilike('postal_code', `${postalCode}%`);
      }

      // Department filter (first 2-3 digits of postal code)
      if (department) {
        query = query.ilike('postal_code', `${department}%`);
      }

      // Industry filter - use prefix match for better performance
      if (industry) {
        query = query.ilike('industry', `${industry}%`);
      }

      // Company size filter
      if (companySize) {
        query = query.eq('company_size', companySize);
      }

      // Has email filter
      if (hasEmail === true) {
        query = query.not('email', 'is', null).neq('email', '');
      }

      // Has phone filter
      if (hasPhone === true) {
        query = query.not('phone', 'is', null).neq('phone', '');
      }

      // Column-level filters (second layer filtering) - only Entreprise, Localisation, Activité
      if (columnFilters) {
        // Company column filter - exact match
        if (columnFilters.company) {
          query = query.eq('company_name', columnFilters.company);
        }
        
        // Location column filter - exact match on city
        if (columnFilters.location) {
          query = query.eq('city', columnFilters.location);
        }
        
        // Industry column filter - exact match
        if (columnFilters.industry) {
          query = query.eq('industry', columnFilters.industry);
        }
        
        // Score range filter
        if (columnFilters.scoreRange) {
          if (columnFilters.scoreRange === 'high') {
            query = query.gte('cold_score', 70);
          } else if (columnFilters.scoreRange === 'medium') {
            query = query.gte('cold_score', 40).lt('cold_score', 70);
          } else if (columnFilters.scoreRange === 'low') {
            query = query.lt('cold_score', 40).not('cold_score', 'is', null);
          } else if (columnFilters.scoreRange === 'none') {
            query = query.is('cold_score', null);
          }
        }
        
        // Status column filter (overrides main status filter if set)
        if (columnFilters.statusFilter) {
          query = query.eq('status', columnFilters.statusFilter);
        }
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        viviers: data as Vivier[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    staleTime: 30 * 1000, // 30 seconds - avoid refetch on navigation
    refetchOnWindowFocus: false, // Disable refetch on tab focus
  });

  // Stats - use centralized hook (single source of truth)
  const { stats } = useVivierStats();

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

  // Bulk create mutation with batching for large imports
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

      // Batch insert in chunks of 500 to avoid timeouts
      const BATCH_SIZE = 500;
      const results: any[] = [];
      
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('viviers')
          .insert(batch as any)
          .select();

        if (error) throw error;
        if (data) results.push(...data);
      }

      return results;
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
    stats,
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
