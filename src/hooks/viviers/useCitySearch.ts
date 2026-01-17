import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseCitySearchOptions {
  search: string;
  enabled?: boolean;
}

/**
 * Hook for searching cities with prefix matching (fast, indexed)
 * Returns up to 50 distinct cities matching the search prefix
 */
export function useCitySearch({ search, enabled = true }: UseCitySearchOptions) {
  return useQuery({
    queryKey: ['vivier-city-search', search],
    queryFn: async (): Promise<string[]> => {
      if (!search || search.length < 2) {
        return [];
      }

      // Use optimized RPC that bypasses RLS overhead and uses indexed search
      const { data, error } = await supabase
        .rpc('search_viviers_cities', {
          p_search: search,
          p_limit: 50
        });

      if (error) {
        console.error('City search error:', error);
        return [];
      }

      if (!data) return [];

      return data.map((row: { city: string }) => row.city);
    },
    enabled: enabled && search.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}
