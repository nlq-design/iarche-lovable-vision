import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LEADS_QUERY_KEY } from '@/hooks/shared/useLeads';
import { BOOKING_QUERY_KEY } from '@/hooks/shared/useBookings';

/**
 * Realtime subscriptions for the Cockpit Dashboard.
 * Listens to changes on tasks, opportunities, bookings, activity_log
 * and auto-invalidates the relevant React Query caches.
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('cockpit-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cockpit-opportunities'] });
          queryClient.invalidateQueries({ queryKey: ['stagnant-opportunities'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cockpit-activity-log'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_notes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cockpit-meeting-notes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
