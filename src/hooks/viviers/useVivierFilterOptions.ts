import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  companies: string[];
  contacts: string[];
  locations: string[];
  industries: string[];
  sirets: string[];
}

export function useVivierFilterOptions() {
  return useQuery({
    queryKey: ['vivier-filter-options'],
    queryFn: async (): Promise<FilterOptions> => {
      // Fetch distinct values for each column in parallel
      const [
        companiesResult,
        contactsResult,
        locationsResult,
        industriesResult,
        siretsResult,
      ] = await Promise.all([
        // Distinct companies (limit to top 200)
        supabase
          .from('viviers')
          .select('company_name')
          .not('company_name', 'is', null)
          .not('company_name', 'eq', '')
          .order('company_name')
          .limit(200),
        
        // Distinct contacts
        supabase
          .from('viviers')
          .select('contact_name')
          .not('contact_name', 'is', null)
          .not('contact_name', 'eq', '')
          .order('contact_name')
          .limit(200),
        
        // Distinct cities for location
        supabase
          .from('viviers')
          .select('city')
          .not('city', 'is', null)
          .not('city', 'eq', '')
          .order('city')
          .limit(200),
        
        // Distinct industries
        supabase
          .from('viviers')
          .select('industry')
          .not('industry', 'is', null)
          .not('industry', 'eq', '')
          .order('industry')
          .limit(200),
        
        // Distinct SIRET prefixes (first 9 digits = SIREN)
        supabase
          .from('viviers')
          .select('siret')
          .not('siret', 'is', null)
          .not('siret', 'eq', '')
          .order('siret')
          .limit(200),
      ]);

      // Extract unique values
      const uniqueCompanies = [...new Set(
        companiesResult.data?.map(r => r.company_name).filter(Boolean) || []
      )];
      
      const uniqueContacts = [...new Set(
        contactsResult.data?.map(r => r.contact_name).filter(Boolean) || []
      )];
      
      const uniqueLocations = [...new Set(
        locationsResult.data?.map(r => r.city).filter(Boolean) || []
      )];
      
      const uniqueIndustries = [...new Set(
        industriesResult.data?.map(r => r.industry).filter(Boolean) || []
      )];
      
      const uniqueSirets = [...new Set(
        siretsResult.data?.map(r => r.siret).filter(Boolean) || []
      )];

      return {
        companies: uniqueCompanies as string[],
        contacts: uniqueContacts as string[],
        locations: uniqueLocations as string[],
        industries: uniqueIndustries as string[],
        sirets: uniqueSirets as string[],
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
