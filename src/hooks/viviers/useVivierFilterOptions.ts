import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FilterOptions {
  companies: string[];
  locations: string[];
  industries: string[];
}

interface UseVivierFilterOptionsParams {
  // Filter 1 parameters to make options contextual
  status?: string;
  city?: string;
  postalCode?: string;
  department?: string;
  industry?: string;
  companySize?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  search?: string;
}

export function useVivierFilterOptions(params: UseVivierFilterOptionsParams = {}) {
  const { status, city, postalCode, department, industry, companySize, hasEmail, hasPhone, search } = params;
  
  return useQuery({
    queryKey: ['vivier-filter-options', status, city, postalCode, department, industry, companySize, hasEmail, hasPhone, search],
    queryFn: async (): Promise<FilterOptions> => {
      // Fetch distinct values for each column with filter 1 applied
      // IMPORTANT: Limit results to avoid timeout on large datasets (130k+ rows)
      const fetchDistinct = async (column: 'company_name' | 'city' | 'industry'): Promise<string[]> => {
        let query = supabase
          .from('viviers')
          .select(column)
          .not(column, 'is', null)
          .neq(column, '');
        
        // Apply filter 1 conditions - use exact match (eq) for city when selected
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        
        // City filter - use exact match for performance (selected from autocomplete)
        if (city) {
          query = query.eq('city', city);
        }
        
        if (postalCode) {
          // Use prefix match for postal code (faster with index)
          query = query.ilike('postal_code', `${postalCode}%`);
        }
        
        if (department) {
          // Use prefix match only for department
          query = query.ilike('postal_code', `${department}%`);
        }
        
        if (industry) {
          // Use prefix match for industry
          query = query.ilike('industry', `${industry}%`);
        }
        
        if (companySize) {
          query = query.eq('company_size', companySize);
        }
        
        if (hasEmail === true) {
          query = query.not('email', 'is', null).neq('email', '');
        }
        
        if (hasPhone === true) {
          query = query.not('phone', 'is', null).neq('phone', '');
        }
        
        if (search) {
          // Use prefix match for search to be faster
          query = query.or(
            `company_name.ilike.${search}%,` +
            `contact_name.ilike.${search}%,` +
            `email.ilike.${search}%`
          );
        }
        
        // CRITICAL: Limit to 500 rows to avoid timeout, then dedupe client-side
        const { data, error } = await query.order(column).limit(500);
        
        if (error) {
          console.error(`Filter options error for ${column}:`, error);
          return [];
        }
        
        if (!data) return [];
        
        const values = data.map((row) => {
          const value = row[column];
          return typeof value === 'string' ? value : null;
        }).filter((v): v is string => v !== null && v !== '');
        
        // Deduplicate and limit to 200 distinct values for UI performance
        return [...new Set(values)].slice(0, 200);
      };

      // Fetch in parallel with error handling
      try {
        const [companies, locations, industries] = await Promise.all([
          fetchDistinct('company_name'),
          fetchDistinct('city'),
          fetchDistinct('industry'),
        ]);
        
        return { companies, locations, industries };
      } catch (error) {
        console.error('Filter options fetch error:', error);
        return { companies: [], locations: [], industries: [] };
      }
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once on error
  });
}
