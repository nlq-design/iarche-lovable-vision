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
      const fetchDistinct = async (column: 'company_name' | 'city' | 'industry'): Promise<string[]> => {
        let query = supabase
          .from('viviers')
          .select(column)
          .not(column, 'is', null)
          .neq(column, '');
        
        // Apply filter 1 conditions
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        
        if (city) {
          query = query.ilike('city', `%${city}%`);
        }
        
        if (postalCode) {
          query = query.ilike('postal_code', `%${postalCode}%`);
        }
        
        if (department) {
          query = query.or(`postal_code.ilike.${department}%,city.ilike.%${department}%`);
        }
        
        if (industry) {
          query = query.ilike('industry', `%${industry}%`);
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
          query = query.or(
            `company_name.ilike.%${search}%,` +
            `contact_name.ilike.%${search}%,` +
            `email.ilike.%${search}%,` +
            `city.ilike.%${search}%`
          );
        }
        
        const { data } = await query.order(column);
        
        if (!data) return [];
        
        const values = data.map((row) => {
          const value = row[column];
          return typeof value === 'string' ? value : null;
        }).filter((v): v is string => v !== null && v !== '');
        
        return [...new Set(values)];
      };

      // Fetch in parallel
      const [companies, locations, industries] = await Promise.all([
        fetchDistinct('company_name'),
        fetchDistinct('city'),
        fetchDistinct('industry'),
      ]);

      return {
        companies,
        locations,
        industries,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (shorter because contextual)
  });
}
