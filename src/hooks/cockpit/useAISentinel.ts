import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SentinelAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'incomplete' | 'inconsistency' | 'inactivity' | 'risk' | 'duplicate' | 'overdue' | 'imbalance';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  question: string;
  detail: string;
}

export function useAISentinel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch alerts (no LLM, SQL only → <500ms)
  const alertsQuery = useQuery({
    queryKey: ['sentinel-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-sentinel', { body: {} });
      if (error) throw error;
      return (data?.alerts || []) as SentinelAlert[];
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch dismissed IDs from DB
  const dismissedQuery = useQuery({
    queryKey: ['sentinel-dismissed', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase
        .from('alert_dismissals')
        .select('alert_id')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString());
      return new Set((data || []).map((d: any) => d.alert_id));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Dismiss mutation → persists in DB with 7-day TTL
  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('alert_dismissals').upsert({
        user_id: user.id,
        alert_id: alertId,
        dismissed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id,alert_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentinel-dismissed'] });
    },
  });

  const dismissedIds = dismissedQuery.data || new Set<string>();
  const activeAlerts = (alertsQuery.data || []).filter(a => !dismissedIds.has(a.id));

  return {
    alerts: activeAlerts,
    total: activeAlerts.length,
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error?.message || null,
    lastFetched: alertsQuery.dataUpdatedAt ? new Date(alertsQuery.dataUpdatedAt) : null,
    dismissAlert: (alertId: string) => dismissMutation.mutate(alertId),
    refresh: () => alertsQuery.refetch(),
  };
}
