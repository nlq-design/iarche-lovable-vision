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
  RefreshCw
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
}

const BackupManagement = () => {
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBackups();
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BackupManagement;
