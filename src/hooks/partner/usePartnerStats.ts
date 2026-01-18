import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerStats {
  activeProjects: number;
  documents: number;
  leads: number;
  solutions: number;
  announcements: number;
}

export function usePartnerStats() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-stats', partnerId],
    queryFn: async (): Promise<PartnerStats> => {
      if (!partnerId) {
        return { activeProjects: 0, documents: 0, leads: 0, solutions: 0, announcements: 0 };
      }

      // Parallel queries for all counts
      const [projectsRes, documentsRes, leadsRes, solutionsRes, announcementsRes] = await Promise.all([
        // Active projects count
        supabase
          .from('project_partners')
          .select('project_id', { count: 'exact', head: true })
          .eq('partner_id', partnerId),
        
        // Documents count
        supabase
          .from('document_partners')
          .select('document_id', { count: 'exact', head: true })
          .eq('partner_id', partnerId),
        
        // Leads count
        supabase
          .from('lead_partners')
          .select('lead_id', { count: 'exact', head: true })
          .eq('partner_id', partnerId),
        
        // Solutions count
        supabase
          .from('solution_partners')
          .select('solution_id', { count: 'exact', head: true })
          .eq('partner_id', partnerId),
        
        // Announcements count (published)
        supabase
          .from('partner_announcements')
          .select('id', { count: 'exact', head: true })
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString()),
      ]);

      return {
        activeProjects: projectsRes.count || 0,
        documents: documentsRes.count || 0,
        leads: leadsRes.count || 0,
        solutions: solutionsRes.count || 0,
        announcements: announcementsRes.count || 0,
      };
    },
    enabled: !!partnerId,
  });
}
