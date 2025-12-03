import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Mail, Settings, History, CheckCircle, XCircle, Clock, Save, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailConfiguration {
  id: string;
  source_type: string;
  source_id: string | null;
  send_user_confirmation: boolean;
  user_email_subject: string | null;
  user_email_template: string | null;
  send_admin_notification: boolean;
  admin_email_subject: string | null;
  admin_emails: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  source_type: string;
  source_id: string | null;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  error_message: string | null;
  metadata: unknown;
  sent_at: string | null;
  created_at: string;
}
const SOURCE_LABELS: Record<string, string> = {
  'contact': 'Formulaire Contact',
  'newsletter': 'Newsletter',
  'livre-blanc': 'Livres Blancs',
  'atelier-webinaire': 'Ateliers & Webinaires',
  'solution-contact': 'Contact Solutions',
  'form': 'Formulaires dynamiques'
};

const AdminEmails = () => {
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const [configRes, logsRes] = await Promise.all([
      supabase.from('email_configurations').select('*').order('source_type'),
      supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    if (configRes.data) setConfigurations(configRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    
    setLoading(false);
  };

  const updateConfiguration = async (id: string, updates: Partial<EmailConfiguration>) => {
    setSaving(id);
    
    const { error } = await supabase
      .from('email_configurations')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } else {
      toast({ title: 'Sauvegardé', description: 'Configuration mise à jour' });
      setConfigurations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
    
    setSaving(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Envoyé</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échoué</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Emails</h1>
            <p className="text-muted-foreground">Configuration des envois et historique</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total envois</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              <p className="text-sm text-muted-foreground">Envoyés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-sm text-muted-foreground">Échoués</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="configuration">
          <TabsList>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-4 mt-4">
            {configurations.map(config => (
              <Card key={config.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      {SOURCE_LABELS[config.source_type] || config.source_type}
                    </CardTitle>
                    <Badge variant={config.is_active ? 'default' : 'secondary'}>
                      {config.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Email utilisateur */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Email de confirmation utilisateur</Label>
                        <Switch
                          checked={config.send_user_confirmation}
                          onCheckedChange={(checked) => updateConfiguration(config.id, { send_user_confirmation: checked })}
                        />
                      </div>
                      {config.send_user_confirmation && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Sujet</Label>
                          <Input
                            value={config.user_email_subject || ''}
                            onChange={(e) => setConfigurations(prev => 
                              prev.map(c => c.id === config.id ? { ...c, user_email_subject: e.target.value } : c)
                            )}
                            placeholder="Sujet de l'email"
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateConfiguration(config.id, { user_email_subject: config.user_email_subject })}
                            disabled={saving === config.id}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Sauvegarder
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Email admin */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Notification admin</Label>
                        <Switch
                          checked={config.send_admin_notification}
                          onCheckedChange={(checked) => updateConfiguration(config.id, { send_admin_notification: checked })}
                        />
                      </div>
                      {config.send_admin_notification && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Sujet</Label>
                          <Input
                            value={config.admin_email_subject || ''}
                            onChange={(e) => setConfigurations(prev => 
                              prev.map(c => c.id === config.id ? { ...c, admin_email_subject: e.target.value } : c)
                            )}
                            placeholder="Sujet de la notification"
                          />
                          <Label className="text-sm text-muted-foreground">Destinataires</Label>
                          <Input
                            value={config.admin_emails?.join(', ') || ''}
                            onChange={(e) => setConfigurations(prev => 
                              prev.map(c => c.id === config.id ? { ...c, admin_emails: e.target.value.split(',').map(s => s.trim()) } : c)
                            )}
                            placeholder="email1@example.com, email2@example.com"
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateConfiguration(config.id, { 
                              admin_email_subject: config.admin_email_subject,
                              admin_emails: config.admin_emails 
                            })}
                            disabled={saving === config.id}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Sauvegarder
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun email envoyé pour le moment
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {SOURCE_LABELS[log.source_type] || log.source_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.recipient_email}</TableCell>
                          <TableCell className="text-sm">
                            {log.email_type === 'user_confirmation' ? 'Confirmation' : 'Notification'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{log.subject}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminEmails;
