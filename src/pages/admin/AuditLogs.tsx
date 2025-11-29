import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Loader2, Filter, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  old_data: any;
  new_data: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, actionFilter, resourceFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'audit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }

    if (resourceFilter !== 'all') {
      filtered = filtered.filter(log => log.resource_type === resourceFilter);
    }

    setFilteredLogs(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      approve: 'bg-purple-100 text-purple-800',
      reject: 'bg-orange-100 text-orange-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getResourceIcon = (resource: string) => {
    const icons: { [key: string]: string } = {
      article: '📄',
      category: '📁',
      tag: '🏷️',
      comment: '💬',
    };
    return icons[resource] || '📝';
  };

  const uniqueActions = [...new Set(logs.map(log => log.action_type))];
  const uniqueResources = [...new Set(logs.map(log => log.resource_type))];

  const toggleExpandLog = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Logs d'audit · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Logs d'audit</h1>
          <p className="text-muted-foreground">
            Suivez toutes les actions administratives importantes sur la plateforme
          </p>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            <CardDescription>
              Filtrez les logs par type d'action ou de ressource
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type d'action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type de ressource</label>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les ressources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les ressources</SelectItem>
                    {uniqueResources.map(resource => (
                      <SelectItem key={resource} value={resource}>
                        {getResourceIcon(resource)} {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{filteredLogs.length}</span> 
              {filteredLogs.length === 1 ? 'log affiché' : 'logs affichés'} sur {logs.length} total
            </div>
          </CardContent>
        </Card>

        {/* Liste des logs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun log d'audit trouvé
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{getResourceIcon(log.resource_type)}</span>
                          <Badge className={getActionColor(log.action_type)}>
                            {log.action_type}
                          </Badge>
                          <Badge variant="outline">
                            {log.resource_type}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {log.resource_name || `ID: ${log.resource_id?.substring(0, 8)}...`}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              👤 {log.user_email || 'Utilisateur inconnu'}
                            </span>
                            <span>
                              🕒 {formatDate(log.created_at)}
                            </span>
                            {log.ip_address && (
                              <span>
                                🌐 {String(log.ip_address)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(log.old_data || log.new_data) && (
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                          title={expandedLog === log.id ? "Masquer les détails" : "Voir les détails"}
                        >
                          {expandedLog === log.id ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Données détaillées */}
                    {expandedLog === log.id && (log.old_data || log.new_data) && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {log.old_data && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Anciennes données :
                            </p>
                            <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.new_data && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Nouvelles données :
                            </p>
                            <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.user_agent && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              User Agent :
                            </p>
                            <p className="text-xs text-muted-foreground break-all">
                              {log.user_agent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;
