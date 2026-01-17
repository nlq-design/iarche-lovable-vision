import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VivierEngagementLevel } from '@/lib/colorCodes';

export interface VivierEngagementStats {
  vivier_id: string;
  campaign_count: number;
  has_opened: boolean;
  has_clicked: boolean;
  has_bounced: boolean;
  engagement_level: VivierEngagementLevel;
}

/**
 * Hook to fetch engagement stats for a list of viviers
 * Uses batched RPC call for performance
 */
export function useVivierEngagement(vivierIds: string[]) {
  return useQuery({
    queryKey: ['vivier-engagement', vivierIds],
    queryFn: async (): Promise<Map<string, VivierEngagementStats>> => {
      if (!vivierIds.length) return new Map();

      const { data, error } = await supabase
        .rpc('get_vivier_engagement_stats', { 
          p_vivier_ids: vivierIds 
        });

      if (error) {
        console.error('Error fetching vivier engagement stats:', error);
        // Return empty map on error - don't break the UI
        return new Map();
      }

      // Convert array to map for O(1) lookup
      const statsMap = new Map<string, VivierEngagementStats>();
      (data || []).forEach((stat: VivierEngagementStats) => {
        statsMap.set(stat.vivier_id, stat);
      });

      return statsMap;
    },
    enabled: vivierIds.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (cacheTime renamed to gcTime in v5)
  });
}

/**
 * Get engagement level for a single vivier
 * Returns 'never_contacted' as default if not found
 */
export function getEngagementLevel(
  stats: Map<string, VivierEngagementStats> | undefined,
  vivierId: string
): VivierEngagementLevel {
  if (!stats) return 'never_contacted';
  const stat = stats.get(vivierId);
  return stat?.engagement_level || 'never_contacted';
}
