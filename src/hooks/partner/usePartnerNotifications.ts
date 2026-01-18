import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface PartnerNotification {
  id: string;
  partner_id: string;
  type: 'assignment' | 'comment' | 'time_validation' | 'announcement' | 'document' | 'mention';
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function usePartnerNotifications() {
  return useQuery({
    queryKey: ['partner-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PartnerNotification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['partner-notifications-unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('partner_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('partner_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['partner-notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('partner_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['partner-notifications-unread-count'] });
    },
  });
}

export function usePartnerNotificationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('partner-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['partner-notifications-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
