import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  source: string;
  qualification_status: string | null;
  lead_score: number | null;
  created_at: string;
  role: string | null;
}

export function usePartnerLeads() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-leads', partnerId],
    queryFn: async (): Promise<PartnerLead[]> => {
      if (!partnerId) return [];

      // Get leads linked to this partner via lead_partners
      const { data: links, error: linksError } = await supabase
        .from('lead_partners')
        .select('lead_id, role')
        .eq('partner_id', partnerId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const leadIds = links.map(l => l.lead_id);
      const roleMap = new Map(links.map(l => [l.lead_id, l.role]));

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          company,
          phone,
          source,
          qualification_status,
          lead_score,
          created_at
        `)
        .in('id', leadIds)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      return (leads || []).map(l => ({
        id: l.id,
        name: l.name,
        email: l.email,
        company: l.company,
        phone: l.phone,
        source: l.source,
        qualification_status: l.qualification_status,
        lead_score: l.lead_score,
        created_at: l.created_at || '',
        role: roleMap.get(l.id) || null,
      }));
    },
    enabled: !!partnerId,
  });
}
