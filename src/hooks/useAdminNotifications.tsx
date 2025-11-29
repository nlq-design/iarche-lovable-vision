import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'comment' | 'newsletter';
  message: string;
  timestamp: string;
  read: boolean;
}

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to new comments
    const commentsChannel = supabase
      .channel('admin-comments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          console.log('New comment notification:', payload);
          const newNotification: Notification = {
            id: `comment-${payload.new.id}`,
            type: 'comment',
            message: `Nouveau commentaire de ${payload.new.author_name}`,
            timestamp: new Date().toISOString(),
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: "Nouveau commentaire",
            description: `${payload.new.author_name} a laissé un commentaire`,
          });
        }
      )
      .subscribe();

    // Subscribe to new newsletter subscribers
    const newsletterChannel = supabase
      .channel('admin-newsletter-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'newsletter_subscribers'
        },
        (payload) => {
          console.log('New subscriber notification:', payload);
          const newNotification: Notification = {
            id: `newsletter-${payload.new.id}`,
            type: 'newsletter',
            message: `Nouvel abonné: ${payload.new.email}`,
            timestamp: new Date().toISOString(),
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: "Nouvel abonné newsletter",
            description: payload.new.email,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(newsletterChannel);
    };
  }, [toast]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};
