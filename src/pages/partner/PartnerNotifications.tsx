import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  usePartnerNotifications, 
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  usePartnerNotificationsRealtime,
} from '@/hooks/partner/usePartnerNotifications';
import { Bell, CheckCheck, Check } from 'lucide-react';
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

export default function PartnerNotifications() {
  const { data: notifications, isLoading } = usePartnerNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Enable realtime
  usePartnerNotificationsRealtime();

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0;

  const getLink = (entityType: string | null) => {
    if (entityType === 'project') return '/espace-partenaire/missions';
    if (entityType === 'lead') return '/espace-partenaire/leads';
    if (entityType === 'announcement') return '/espace-partenaire/annonces';
    if (entityType === 'time_entry') return '/espace-partenaire/temps';
    return '/espace-partenaire';
  };

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 
                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` 
                : 'Toutes vos notifications sont lues'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>
              Vos 50 dernières notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune notification</p>
                <p className="text-sm">Les nouvelles notifications apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`flex items-start gap-4 py-4 ${
                      !notification.is_read ? 'bg-primary/5 -mx-4 px-4 rounded-lg' : ''
                    }`}
                  >
                    <span className="text-2xl mt-1">{typeIcons[notification.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[notification.type] || notification.type}
                        </Badge>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">Nouveau</Badge>
                        )}
                      </div>
                      <p className="font-medium">{notification.title}</p>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markRead.mutate(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link to={getLink(notification.entity_type)}>
                          Voir
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
