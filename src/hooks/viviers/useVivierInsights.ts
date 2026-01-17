import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VivierStats {
  total_leads: number;
  avg_score: number;
  high_score_count: number;
  recent_imports_7d: number;
  hot_leads_count: number;
  complete_data_count: number;
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
}

export interface VivierOpportunity {
  type: 'hot_leads' | 'golden_segment' | 'quick_win' | 'reactivation';
  title: string;
  description: string;
  count: number;
  avg_score: number;
  priority: 'high' | 'medium';
  action: {
    type: 'search' | 'export' | 'create_list' | 'score';
    label: string;
    query: string;
  };
}

export interface VivierInsightsResponse {
  success: boolean;
  stats: VivierStats | null;
  opportunities: VivierOpportunity[];
  daily_summary: string;
  error?: string;
}

// Legacy interface for backward compatibility
export interface VivierInsight {
  type: 'opportunity' | 'cohort' | 'trend' | 'alert';
  title: string;
  description: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
  suggested_query?: string;
}

async function fetchVivierInsights(): Promise<VivierInsightsResponse> {
  const { data, error } = await supabase.functions.invoke('vivier-insights');

  if (error) {
    throw new Error(error.message || 'Failed to fetch insights');
  }

  return {
    success: data?.success ?? false,
    stats: data?.stats ?? null,
    opportunities: data?.opportunities ?? [],
    daily_summary: data?.daily_summary ?? '',
    error: data?.error,
  };
}

/**
 * Hook optimized for large datasets - caches insights for 5 minutes
 */
export function useVivierInsights() {
  return useQuery({
    queryKey: ['vivier-insights'],
    queryFn: fetchVivierInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}
