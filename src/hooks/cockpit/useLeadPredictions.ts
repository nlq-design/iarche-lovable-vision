import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadPredictiveAlert {
  id: string;
  lead_id: string;
  name: string | null;
  company: string | null;
  alert_type: 'churn' | 'conversion';
  score: number;
  signals: Record<string, unknown>;
  computed_at: string;
}

/**
 * Phase H — Predictive Scoring
 * Source : vue `top_predictive_alerts` (calculée par cron 06:30 UTC, zéro LLM).
 */
export function useLeadPredictions(workspaceId?: string) {
  return useQuery({
    queryKey: ['lead-predictions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as LeadPredictiveAlert[];
      const { data, error } = await supabase
        .from('top_predictive_alerts' as any)
        .select('id, lead_id, name, company, alert_type, score, signals, computed_at')
        .eq('workspace_id', workspaceId)
        .order('score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as LeadPredictiveAlert[];
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 30, // 30 min — données quotidiennes
  });
}
