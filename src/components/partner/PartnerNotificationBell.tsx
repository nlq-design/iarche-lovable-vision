import { useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  usePartnerNotifications, 
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  usePartnerNotificationsRealtime,
  PartnerNotification,
} from '@/hooks/partner/usePartnerNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const typeIcons: Record<string, string> = {
  assignment: '📋',
  comment: '💬',
  time_validation: '⏱️',
  announcement: '📢',
  document: '📄',
  mention: '@',
};

const typeLabels: Record<string, string> = {
  assignment: 'Assignation',
  comment: 'Commentaire',
  time_validation: 'Temps',
  announcement: 'Annonce',
  document: 'Document',
  mention: 'Mention',
};

function NotificationItem({ notification, onRead }: { notification: PartnerNotification; onRead: (id: string) => void }) {
  const getLink = () => {
    if (notification.entity_type === 'project') return '/espace-partenaire/missions';
    if (notification.entity_type === 'lead') return '/espace-partenaire/leads';
    if (notification.entity_type === 'announcement') return '/espace-partenaire/annonces';
    if (notification.entity_type === 'time_entry') return '/espace-partenaire/temps';
    return '/espace-partenaire';
  };

  return (
    <Link
      to={getLink()}
      className={`block p-3 hover:bg-muted/50 transition-colors ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => !notification.is_read && onRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{typeIcons[notification.type] || '📌'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {typeLabels[notification.type] || notification.type}
            </span>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="font-medium text-sm truncate">{notification.title}</p>
          {notification.message && (
            <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function PartnerNotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = usePartnerNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Enable realtime updates
  usePartnerNotificationsRealtime();

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                asChild
              >
                <Link to="/espace-partenaire/notifications">
                  Voir toutes les notifications
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
