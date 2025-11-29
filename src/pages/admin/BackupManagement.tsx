import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Database, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Play,
  FileText
} from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Backup {
  id: string;
  backup_type: string;
  status: string;
  file_size_bytes: number | null;
  tables_backed_up: string[] | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  execution_logs: any;
  progress_percentage: number | null;
  current_table: string | null;
  integrity_check_status: string | null;
  integrity_check_at: string | null;
  restoration_possible: boolean | null;
}

const BackupManagement = () => {
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('backup-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'database_backups'
        },
        (payload) => {
          console.log('Backup update:', payload);
          loadBackups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('database_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les backups',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-database-backup', {
        body: { backup_type: 'manual' }
      });

      if (error) throw error;

      toast({
        title: 'Backup créé',
        description: `${data.details.total_records} enregistrements sauvegardés (${data.details.file_size_mb} MB)`,
      });

      loadBackups();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le backup',
        variant: 'destructive',
      });
    }
    setCreating(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      in_progress: 'secondary',
      pending: 'outline'
    };

    const labels: Record<string, string> = {
      completed: 'Terminé',
      failed: 'Échoué',
      in_progress: 'En cours',
      pending: 'En attente'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const verifyIntegrity = async (backupId: string) => {
    setVerifying(backupId);
    try {
      const { data, error } = await supabase.functions.invoke('verify-backup-integrity', {
        body: { backup_id: backupId }
      });

      if (error) throw error;

      toast({
        title: 'Vérification terminée',
        description: `Score d'intégrité: ${data.integrity_check.score}/100 (${data.integrity_check.status})`,
      });

      loadBackups();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de vérifier l\'intégrité',
        variant: 'destructive',
      });
    }
    setVerifying(null);
  };

  const restoreBackup = async (backupId: string, previewMode = true) => {
    setRestoring(backupId);
    try {
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { 
          backup_id: backupId,
          preview_mode: previewMode
        }
      });

      if (error) throw error;

      if (previewMode) {
        toast({
          title: 'Aperçu du backup',
          description: `${data.backup_info.tables_count} tables · ${data.backup_info.file_size_mb} MB`,
        });
      } else {
        toast({
          title: 'Restauration réussie',
          description: 'Les données ont été restaurées',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Info',
        description: error.message || 'Fonctionnalité en cours de développement',
      });
    }
    setRestoring(null);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Gestion des backups · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Gestion des backups
            </h1>
            <p className="text-muted-foreground">
              Sauvegardez et restaurez votre base de données
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadBackups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button onClick={createBackup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Créer un backup
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total des backups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{backups.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Backups réussis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">
                  {backups.filter(b => b.status === 'completed').length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Dernier backup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {backups[0] ? formatDistance(new Date(backups[0].created_at), new Date(), { 
                    addSuffix: true, 
                    locale: fr 
                  }) : 'Aucun'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des backups */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des backups</CardTitle>
            <CardDescription>
              Liste des 20 derniers backups de la base de données
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun backup pour le moment</p>
                <Button onClick={createBackup} className="mt-4" disabled={creating}>
                  <Database className="h-4 w-4 mr-2" />
                  Créer le premier backup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-start justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex gap-4 flex-1">
                      <div className="text-muted-foreground mt-1">
                        {getStatusIcon(backup.status)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Backup {backup.backup_type === 'manual' ? 'manuel' : 'automatique'}
                          </span>
                          {getStatusBadge(backup.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(backup.started_at).toLocaleString('fr-FR')}
                          </div>
                          
                          {backup.file_size_bytes && (
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4" />
                              {formatFileSize(backup.file_size_bytes)}
                            </div>
                          )}
                          
                          {backup.tables_backed_up && (
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              {backup.tables_backed_up.length} tables
                            </div>
                          )}
                          
                          {backup.completed_at && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Durée: {Math.round(
                                (new Date(backup.completed_at).getTime() - new Date(backup.started_at).getTime()) / 1000
                              )}s
                            </div>
                          )}
                        </div>

                        {backup.error_message && (
                          <div className="text-sm text-destructive mt-2">
                            <strong>Erreur:</strong> {backup.error_message}
                          </div>
                        )}

                        {backup.progress_percentage !== null && backup.progress_percentage < 100 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Progression</span>
                              <span>{backup.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${backup.progress_percentage}%` }}
                              />
                            </div>
                            {backup.current_table && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Table en cours: {backup.current_table}
                              </p>
                            )}
                          </div>
                        )}

                        {backup.integrity_check_status && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span>Intégrité: {backup.integrity_check_status}</span>
                            {!backup.restoration_possible && (
                              <Badge variant="destructive">Non restaurable</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {backup.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyIntegrity(backup.id)}
                            disabled={verifying === backup.id}
                          >
                            {verifying === backup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreBackup(backup.id, true)}
                            disabled={restoring === backup.id || !backup.restoration_possible}
                          >
                            {restoring === backup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          {backup.execution_logs && backup.execution_logs.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowLogs(true);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal des logs */}
        {showLogs && selectedBackup && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Logs d'exécution</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowLogs(false)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Backup {selectedBackup.backup_type} · {new Date(selectedBackup.created_at).toLocaleString('fr-FR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[60vh]">
                <div className="space-y-2 font-mono text-sm">
                  {selectedBackup.execution_logs?.map((log: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded border ${
                        log.level === 'error' ? 'bg-destructive/10 border-destructive' :
                        log.level === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                        log.level === 'success' ? 'bg-green-500/10 border-green-500' :
                        'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground text-xs">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                        <span className={`text-xs font-semibold uppercase ${
                          log.level === 'error' ? 'text-destructive' :
                          log.level === 'warning' ? 'text-yellow-600' :
                          log.level === 'success' ? 'text-green-600' :
                          'text-muted-foreground'
                        }`}>
                          {log.level}
                        </span>
                      </div>
                      <p className="mt-1">{log.message}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BackupManagement;
