import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useMorningBrief() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['morning-brief', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'morning-brief',
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        brief: string;
        data: {
          today_tasks: Array<{
            id: string;
            title: string;
            priority: 'critical' | 'high' | 'medium' | 'low';
            due_time?: string;
          }>;
          today_bookings: Array<{
            id: string;
            start_time: string;
            name: string;
            company?: string;
            email?: string;
          }>;
          inactivity_alerts: Array<{
            entity_id: string;
            entity_name: string;
            entity_type: string;
            severity: 'critical' | 'high' | 'medium';
            days_inactive: number;
            suggestion: string;
          }>;
          health_summary: {
            on_track: number;
            at_risk: number;
            off_track: number;
          };
        };
      };
    },
    staleTime: 60 * 60 * 1000, // 1h cache
    enabled: false, // Lazy load
  });
}
