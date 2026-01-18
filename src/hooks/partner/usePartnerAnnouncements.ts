import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerAnnouncement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
}

export function usePartnerAnnouncements() {
  return useQuery({
    queryKey: ['partner-announcements'],
    queryFn: async (): Promise<PartnerAnnouncement[]> => {
      const { data, error } = await supabase
        .from('partner_announcements')
        .select(`
          id,
          title,
          content,
          is_pinned,
          published_at,
          created_at
        `)
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        is_pinned: a.is_pinned || false,
        published_at: a.published_at,
        created_at: a.created_at || '',
      }));
    },
  });
}
