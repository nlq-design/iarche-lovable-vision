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

      // Use prefix match (city%) instead of contains (%city%) for performance
      // This is much faster as it can use indexes
      const { data, error } = await supabase
        .from('viviers')
        .select('city')
        .not('city', 'is', null)
        .neq('city', '')
        .ilike('city', `${search.toUpperCase()}%`)
        .order('city')
        .limit(200); // Fetch more to dedupe, but limit for performance

      if (error) {
        console.error('City search error:', error);
        return [];
      }

      if (!data) return [];

      // Deduplicate and take first 50
      const uniqueCities = [...new Set(
        data
          .map(row => row.city)
          .filter((city): city is string => typeof city === 'string' && city !== '')
      )].slice(0, 50);

      return uniqueCities;
    },
    enabled: enabled && search.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}
