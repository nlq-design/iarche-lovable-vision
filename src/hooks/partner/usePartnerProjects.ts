import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerProject {
  id: string;
  name: string;
  status: string;
  health_status: string | null;
  start_date: string | null;
  target_end_date: string | null;
  budget_amount: number | null;
  consumed_amount: number | null;
  created_at: string;
  role: string | null;
  opportunity?: {
    id: string;
    title: string;
    lead?: {
      id: string;
      name: string;
      company: string | null;
    } | null;
  } | null;
}

export function usePartnerProjects() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-projects', partnerId],
    queryFn: async (): Promise<PartnerProject[]> => {
      if (!partnerId) return [];

      // Get projects linked to this partner via project_partners
      const { data: links, error: linksError } = await supabase
        .from('project_partners')
        .select('project_id, role')
        .eq('partner_id', partnerId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const projectIds = links.map(l => l.project_id);
      const roleMap = new Map(links.map(l => [l.project_id, l.role]));

      // Fetch projects with opportunity and lead info
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          health_status,
          start_date,
          target_end_date,
          budget_amount,
          consumed_amount,
          created_at,
          opportunities:opportunity_id (
            id,
            title,
            leads:lead_id (
              id,
              name,
              company
            )
          )
        `)
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      return (projects || []).map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        health_status: p.health_status,
        start_date: p.start_date,
        target_end_date: p.target_end_date,
        budget_amount: p.budget_amount,
        consumed_amount: p.consumed_amount,
        created_at: p.created_at || '',
        role: roleMap.get(p.id) || null,
        opportunity: p.opportunities ? {
          id: p.opportunities.id,
          title: p.opportunities.title,
          lead: p.opportunities.leads ? {
            id: p.opportunities.leads.id,
            name: p.opportunities.leads.name,
            company: p.opportunities.leads.company,
          } : null,
        } : null,
      }));
    },
    enabled: !!partnerId,
  });
}
