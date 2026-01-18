import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerDocument {
  id: string;
  title: string;
  document_type: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  role: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
  opportunity?: {
    id: string;
    title: string;
  } | null;
}

export function usePartnerDocuments() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-documents', partnerId],
    queryFn: async (): Promise<PartnerDocument[]> => {
      if (!partnerId) return [];

      // Get documents linked to this partner via document_partners
      const { data: links, error: linksError } = await supabase
        .from('document_partners')
        .select('document_id, role')
        .eq('partner_id', partnerId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const documentIds = links.map(l => l.document_id);
      const roleMap = new Map(links.map(l => [l.document_id, l.role]));

      // Fetch documents with project and opportunity info
      const { data: documents, error: docsError } = await supabase
        .from('generated_documents')
        .select(`
          id,
          title,
          document_type,
          status,
          created_at,
          updated_at,
          projects:project_id (
            id,
            name
          ),
          opportunities:opportunity_id (
            id,
            title
          )
        `)
        .in('id', documentIds)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      return (documents || []).map(d => ({
        id: d.id,
        title: d.title,
        document_type: d.document_type,
        status: d.status,
        created_at: d.created_at || '',
        updated_at: d.updated_at,
        role: roleMap.get(d.id) || null,
        project: d.projects ? {
          id: d.projects.id,
          name: d.projects.name,
        } : null,
        opportunity: d.opportunities ? {
          id: d.opportunities.id,
          title: d.opportunities.title,
        } : null,
      }));
    },
    enabled: !!partnerId,
  });
}
