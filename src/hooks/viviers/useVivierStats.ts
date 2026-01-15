import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VivierStats {
  totalLeads: number;
  pendingScoring: number;
  qualified: number;
  promoted: number;
  scored: number;
}

export interface VivierScoreBreakdown {
  pending: number;
  high: number;    // Score >= 80
  medium: number;  // Score 40-79
  low: number;     // Score < 40
}

const DEFAULT_STATS: VivierStats = {
  totalLeads: 0,
  pendingScoring: 0,
  qualified: 0,
  promoted: 0,
  scored: 0,
};

const DEFAULT_BREAKDOWN: VivierScoreBreakdown = {
  pending: 0,
  high: 0,
  medium: 0,
  low: 0,
};

/**
 * Single source of truth for viviers statistics.
 * Uses optimized RPC function `get_viviers_stats` to avoid row-level RLS overhead.
 * 
 * @param options.refetchInterval - Auto-refetch interval in ms (default: false)
 * @param options.includeBreakdown - Also fetch score breakdown (high/medium/low)
 */
export function useVivierStats(options: {
  refetchInterval?: number | false;
  includeBreakdown?: boolean;
} = {}) {
  const { refetchInterval = false, includeBreakdown = false } = options;

  const statsQuery = useQuery({
    queryKey: ['viviers-stats'],
    queryFn: async (): Promise<VivierStats> => {
      const { data, error } = await supabase.rpc('get_viviers_stats');

      if (error) {
        console.error('Error fetching viviers stats:', error);
        return DEFAULT_STATS;
      }

      const row = data?.[0];
      return {
        totalLeads: Number(row?.total_leads ?? 0),
        pendingScoring: Number(row?.pending_scoring ?? 0),
        qualified: Number(row?.qualified ?? 0),
        promoted: Number(row?.promoted ?? 0),
        scored: Number(row?.scored ?? 0),
      };
    },
    staleTime: 30 * 1000, // 30 seconds cache
    refetchOnWindowFocus: false,
    refetchInterval,
  });

  // Breakdown query - only runs if includeBreakdown is true AND we have scored leads
  const breakdownQuery = useQuery({
    queryKey: ['viviers-stats-breakdown'],
    queryFn: async (): Promise<VivierScoreBreakdown> => {
      // Get breakdown by score range
      const [high, medium, low] = await Promise.all([
        supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 80),
        supabase.from('viviers').select('id', { count: 'exact', head: true }).gte('cold_score', 40).lt('cold_score', 80),
        supabase.from('viviers').select('id', { count: 'exact', head: true }).lt('cold_score', 40).not('cold_score', 'is', null),
      ]);

      return {
        pending: statsQuery.data?.pendingScoring ?? 0,
        high: high.count ?? 0,
        medium: medium.count ?? 0,
        low: low.count ?? 0,
      };
    },
    enabled: includeBreakdown && (statsQuery.data?.scored ?? 0) > 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    stats: statsQuery.data ?? DEFAULT_STATS,
    breakdown: breakdownQuery.data ?? { ...DEFAULT_BREAKDOWN, pending: statsQuery.data?.pendingScoring ?? 0 },
    isLoading: statsQuery.isLoading,
    isBreakdownLoading: breakdownQuery.isLoading,
    refetch: statsQuery.refetch,
    refetchBreakdown: breakdownQuery.refetch,
  };
}
