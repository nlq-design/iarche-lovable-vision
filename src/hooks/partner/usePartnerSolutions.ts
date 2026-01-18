import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerSolution {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  role: string | null;
  tags: string[] | null;
  thematiques: string[] | null;
}

export function usePartnerSolutions() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-solutions', partnerId],
    queryFn: async (): Promise<PartnerSolution[]> => {
      if (!partnerId) return [];

      // Get solutions linked to this partner via solution_partners
      const { data: links, error: linksError } = await supabase
        .from('solution_partners')
        .select('solution_id, role')
        .eq('partner_id', partnerId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const solutionIds = links.map(l => l.solution_id);
      const roleMap = new Map(links.map(l => [l.solution_id, l.role]));

      // Fetch solutions from articles table (solutions are stored there)
      const { data: solutions, error: solutionsError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          cover_image_url,
          published,
          created_at,
          tags,
          thematiques
        `)
        .in('id', solutionIds)
        .eq('resource_type', 'solution')
        .order('created_at', { ascending: false });

      if (solutionsError) throw solutionsError;

      return (solutions || []).map(s => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        cover_image_url: s.cover_image_url,
        published: s.published || false,
        created_at: s.created_at || '',
        role: roleMap.get(s.id) || null,
        tags: s.tags || null,
        thematiques: s.thematiques || null,
      }));
    },
    enabled: !!partnerId,
  });
}
