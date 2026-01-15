import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VivierStats {
  total_leads: number;
  avg_score: number;
  high_score_count: number;
  not_contacted_30d: number;
  top_industries: Array<{ industry: string; count: number; avg_score: number }>;
  top_cities: Array<{ city: string; count: number }>;
  score_distribution: Array<{ range: string; count: number }>;
}

export interface VivierInsight {
  type: 'opportunity' | 'cohort' | 'trend' | 'alert';
  title: string;
  description: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
  suggested_query?: string;
}

interface VivierInsightsResponse {
  success: boolean;
  stats: VivierStats | null;
  insights: VivierInsight[];
  error?: string;
}

async function fetchVivierInsights(): Promise<VivierInsightsResponse> {
  const { data, error } = await supabase.functions.invoke('vivier-insights');

  if (error) {
    throw new Error(error.message || 'Failed to fetch insights');
  }

  return {
    success: data?.success ?? false,
    stats: data?.stats ?? null,
    insights: data?.insights ?? [],
    error: data?.error,
  };
}

/**
 * Hook optimized for large datasets - caches insights for 15 minutes
 * to avoid redundant expensive calls to the vivier-insights edge function
 */
export function useVivierInsights() {
  return useQuery({
    queryKey: ['vivier-insights'],
    queryFn: fetchVivierInsights,
    staleTime: 15 * 60 * 1000, // 15 minutes - insights don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Use cached data when navigating back
    retry: 1, // Only retry once on failure
  });
}
