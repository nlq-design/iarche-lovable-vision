import { usePartnerLoginHistory } from '@/hooks/cockpit/usePartnerLoginHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Monitor, Smartphone, Tablet, Clock, Calendar, Shield, Activity } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnerLoginHistoryTabProps {
  partnerId: string;
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

function getBrowserFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Inconnu';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Autre';
}

export function PartnerLoginHistoryTab({ partnerId }: PartnerLoginHistoryTabProps) {
  const { history, stats, isLoading, error } = usePartnerLoginHistory(partnerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Erreur lors du chargement de l'historique
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Total connexions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalLogins ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              7 derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.recentLogins ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              Appareils uniques
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.uniqueDevices ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Dernière connexion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {stats?.lastLoginAt
                ? formatDistanceToNow(new Date(stats.lastLoginAt), { addSuffix: true, locale: fr })
                : 'Jamais'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Historique des connexions
          </CardTitle>
          <CardDescription>
            Les 50 dernières sessions du partenaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune connexion enregistrée
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        {getDeviceIcon(entry.device_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {format(new Date(entry.logged_in_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {entry.device_type || 'desktop'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getBrowserFromUserAgent(entry.user_agent)}</span>
                          {entry.ip_address && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{entry.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.logged_in_at), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
