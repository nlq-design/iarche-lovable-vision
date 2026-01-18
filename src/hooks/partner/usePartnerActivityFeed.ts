import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerActivity {
  id: string;
  partner_id: string;
  activity_type: string;
  title: string;
  description: string;
  entity_id: string | null;
  entity_type: string | null;
  created_at: string;
}

interface UsePartnerActivityFeedOptions {
  limit?: number;
  activityTypes?: string[];
  entityType?: string;
}

export function usePartnerActivityFeed(options: UsePartnerActivityFeedOptions = {}) {
  const { limit = 50, activityTypes, entityType } = options;

  return useQuery({
    queryKey: ['partner-activity-feed', { limit, activityTypes, entityType }],
    queryFn: async () => {
      // Get current partner ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (partnerError || !partner) throw new Error('Partenaire non trouvé');

      let query = supabase
        .from('partner_activity_feed')
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PartnerActivity[];
    },
  });
}

export function usePartnerActivityStats() {
  return useQuery({
    queryKey: ['partner-activity-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (partnerError || !partner) throw new Error('Partenaire non trouvé');

      const { data, error } = await supabase
        .from('partner_activity_feed')
        .select('activity_type')
        .eq('partner_id', partner.id);

      if (error) throw error;

      const stats = {
        total: data.length,
        transcriptions: data.filter(d => d.activity_type === 'transcription').length,
        comments: data.filter(d => d.activity_type === 'comment').length,
        timeEntries: data.filter(d => d.activity_type === 'time_entry').length,
        leadsCreated: data.filter(d => d.activity_type === 'lead_created').length,
        projectsCreated: data.filter(d => d.activity_type === 'project_created').length,
      };

      return stats;
    },
  });
}
