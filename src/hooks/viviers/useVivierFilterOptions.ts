import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FilterOptions {
  companies: string[];
  locations: string[];
  industries: string[];
}

interface UseVivierFilterOptionsParams {
  department?: string;
}

export function useVivierFilterOptions(params: UseVivierFilterOptionsParams = {}) {
  const { department } = params;
  
  return useQuery({
    queryKey: ['vivier-filter-options', department],
    queryFn: async (): Promise<FilterOptions> => {
      // Use optimized RPC that bypasses RLS overhead
      const { data, error } = await supabase
        .rpc('get_viviers_filter_options', {
          p_department: department || null,
          p_limit: 200
        });

      if (error) {
        console.error('Filter options error:', error);
        return { companies: [], locations: [], industries: [] };
      }

      if (!data) {
        return { companies: [], locations: [], industries: [] };
      }

      // Group by option_type
      const companies: string[] = [];
      const locations: string[] = [];
      const industries: string[] = [];

      for (const row of data as { option_type: string; option_value: string }[]) {
        switch (row.option_type) {
          case 'company':
            companies.push(row.option_value);
            break;
          case 'city':
            locations.push(row.option_value);
            break;
          case 'industry':
            industries.push(row.option_value);
            break;
        }
      }

      return { companies, locations, industries };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
