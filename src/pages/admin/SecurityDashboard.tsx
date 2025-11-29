import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Loader2, Shield, AlertTriangle, Activity, Users, FileText, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SecurityMetrics {
  totalActions: number;
  recentActions: number;
  uniqueUsers: number;
  deletionActions: number;
  lastActivity: string | null;
  actionsByType: { [key: string]: number };
  actionsByResource: { [key: string]: number };
  recentSuspiciousActivities: Array<{
    id: string;
    action_type: string;
    resource_type: string;
    user_email: string | null;
    created_at: string;
  }>;
}

const SecurityDashboard = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityMetrics();
    
    // Rafraîchir les métriques toutes les 30 secondes
    const interval = setInterval(loadSecurityMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentLogs = logs?.filter(log => 
        new Date(log.created_at) > last24Hours
      ) || [];

      const uniqueUsers = new Set(
        logs?.map(log => log.user_id).filter(Boolean)
      ).size;

      const deletionActions = logs?.filter(log => 
        log.action_type === 'delete'
      ).length || 0;

      const actionsByType: { [key: string]: number } = {};
      const actionsByResource: { [key: string]: number } = {};

      logs?.forEach(log => {
        actionsByType[log.action_type] = (actionsByType[log.action_type] || 0) + 1;
        actionsByResource[log.resource_type] = (actionsByResource[log.resource_type] || 0) + 1;
      });

      // Activités suspectes : suppressions multiples, modifications en masse
      const suspiciousActivities = logs
        ?.filter(log => log.action_type === 'delete')
        .slice(0, 5) || [];

      setMetrics({
        totalActions: logs?.length || 0,
        recentActions: recentLogs.length,
        uniqueUsers,
        deletionActions,
        lastActivity: logs?.[0]?.created_at || null,
        actionsByType,
        actionsByResource,
        recentSuspiciousActivities: suspiciousActivities.map(log => ({
          id: log.id,
          action_type: log.action_type,
          resource_type: log.resource_type,
          user_email: log.user_email,
          created_at: log.created_at
        }))
      });

    } catch (error) {
      console.error('Error loading security metrics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les métriques de sécurité",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSecurityLevel = () => {
    if (!metrics) return { level: 'unknown', color: 'bg-gray-100 text-gray-800', label: 'Chargement...' };
    
    if (metrics.deletionActions > 10 || metrics.recentActions > 100) {
      return { level: 'warning', color: 'bg-orange-100 text-orange-800', label: 'Activité élevée' };
    }
    
    if (metrics.deletionActions > 5) {
      return { level: 'caution', color: 'bg-yellow-100 text-yellow-800', label: 'Surveillance' };
    }
    
    return { level: 'normal', color: 'bg-green-100 text-green-800', label: 'Normal' };
  };

  const securityLevel = getSecurityLevel();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Dashboard Sécurité · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Dashboard de sécurité</h1>
              <p className="text-muted-foreground">
                Surveillance en temps réel des activités et métriques de sécurité
              </p>
            </div>
            <Badge className={securityLevel.color}>
              <Shield className="h-3 w-3 mr-1" />
              {securityLevel.label}
            </Badge>
          </div>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Actions totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalActions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Depuis le début
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                Dernières 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.recentActions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Actions récentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Utilisateurs actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.uniqueUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Admins uniques
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Suppressions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.deletionActions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Actions de suppression
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Actions par type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Actions par type
              </CardTitle>
              <CardDescription>Répartition des actions effectuées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics?.actionsByType || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(count / (metrics?.totalActions || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Ressources modifiées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Ressources modifiées
              </CardTitle>
              <CardDescription>Types de ressources affectées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics?.actionsByResource || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([resource, count]) => (
                    <div key={resource} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {resource}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-accent h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(count / (metrics?.totalActions || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activités suspectes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Activités récentes de suppression
            </CardTitle>
            <CardDescription>
              Surveillez les suppressions effectuées par les administrateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.recentSuspiciousActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune activité de suppression récente
              </p>
            ) : (
              <div className="space-y-3">
                {metrics?.recentSuspiciousActivities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-orange-50/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Suppression : {activity.resource_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Par {activity.user_email || 'Utilisateur inconnu'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dernière activité */}
        {metrics?.lastActivity && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Dernière activité enregistrée
                </div>
                <div className="text-sm font-medium">
                  {formatDate(metrics.lastActivity)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default SecurityDashboard;
