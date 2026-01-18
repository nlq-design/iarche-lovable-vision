import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerTranscription {
  id: string;
  slug: string | null;
  title: string | null;
  status: string;
  transcription_date: string | null;
  created_at: string;
  lead_id: string | null;
  project_id: string | null;
  solution_id: string | null;
  is_own: boolean;
  lead?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

export function usePartnerTranscriptions() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-transcriptions', partnerId],
    queryFn: async (): Promise<PartnerTranscription[]> => {
      if (!partnerId) return [];

      // Get transcriptions via RLS (includes created by partner + linked entities)
      const { data: transcriptions, error } = await supabase
        .from('voice_transcriptions')
        .select(`
          id,
          slug,
          title,
          status,
          transcription_date,
          created_at,
          lead_id,
          project_id,
          solution_id,
          created_by_partner_id,
          leads:lead_id (id, name),
          projects:project_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (transcriptions || []).map(t => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        status: t.status,
        transcription_date: t.transcription_date,
        created_at: t.created_at || '',
        lead_id: t.lead_id,
        project_id: t.project_id,
        solution_id: t.solution_id,
        is_own: t.created_by_partner_id === partnerId,
        lead: t.leads as { id: string; name: string } | null,
        project: t.projects as { id: string; name: string } | null,
      }));
    },
    enabled: !!partnerId,
  });
}
