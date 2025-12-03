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
import { Mail, Settings, History, CheckCircle, XCircle, Clock, Save, RefreshCw, FileCode, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmailTemplateEditor } from '@/components/admin/EmailTemplateEditor';

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

// Sources qui supportent les templates personnalisés
const TEMPLATE_SOURCES = ['contact', 'newsletter', 'livre-blanc', 'atelier-webinaire', 'solution-contact'];

const AdminEmails = () => {
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
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

  const resendEmail = async (log: EmailLog) => {
    setResending(log.id);
    
    try {
      const metadata = log.metadata as Record<string, unknown> || {};
      
      // Déterminer quelle edge function appeler selon le source_type
      let functionName = '';
      let body: Record<string, unknown> = {};
      
      // Déterminer si c'est un email utilisateur ou admin
      const isUserConfirmation = log.email_type === 'user_confirmation';
      
      switch (log.source_type) {
        case 'atelier-webinaire':
          functionName = 'send-atelier-confirmation';
          body = {
            name: metadata.name || 'Participant',
            email: log.recipient_email,
            atelier_title: metadata.atelier_title || 'Atelier',
            atelier_id: log.source_id,
            event_date: null,
            event_location: null,
            heure_debut: null,
            type_evenement: null
          };
          break;
        case 'contact':
        case 'solution-contact':
          if (isUserConfirmation) {
            functionName = 'send-user-confirmation';
            body = {
              email: log.recipient_email,
              name: metadata.name || 'Utilisateur',
              source_type: log.source_type,
              source_context: metadata.source_context
            };
          } else {
            functionName = 'send-lead-notification';
            body = {
              name: metadata.name || 'Lead',
              email: metadata.email || log.recipient_email,
              company: metadata.company,
              phone: metadata.phone,
              source: log.source_type,
              source_context: metadata.source_context
            };
          }
          break;
        case 'livre-blanc':
          if (isUserConfirmation) {
            functionName = 'send-user-confirmation';
            body = {
              email: log.recipient_email,
              name: metadata.name || 'Utilisateur',
              source_type: 'livre-blanc',
              source_id: log.source_id,
              source_context: metadata.source_context,
              livre_blanc_title: metadata.source_context,
              file_url: metadata.file_url
            };
          } else {
            functionName = 'send-lead-notification';
            body = {
              name: metadata.name || 'Lead',
              email: metadata.email || log.recipient_email,
              company: metadata.company,
              phone: metadata.phone,
              source: 'livre-blanc',
              source_context: metadata.source_context
            };
          }
          break;
        case 'newsletter':
          functionName = 'send-user-confirmation';
          body = {
            email: log.recipient_email,
            name: metadata.name || log.recipient_email.split('@')[0],
            source_type: 'newsletter'
          };
          break;
        case 'comment':
          functionName = 'notify-new-comment';
          body = {
            comment_id: log.source_id || 'resend',
            article_id: metadata.article_id || '',
            author_name: metadata.author_name || 'Auteur',
            author_email: metadata.author_email || '',
            content: ''
          };
          break;
        case 'security':
          functionName = 'send-security-alert';
          body = {
            alert: {
              severity: metadata.severity || 'medium',
              title: metadata.alert_title || 'Alerte',
              description: 'Renvoi d\'alerte',
              details: null
            }
          };
          break;
        default:
          toast({ title: 'Erreur', description: 'Type d\'email non supporté pour le renvoi', variant: 'destructive' });
          setResending(null);
          return;
      }

      const { error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: 'Email renvoyé avec succès' });
        loadData(); // Refresh logs
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    }
    
    setResending(null);
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
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Templates
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

          <TabsContent value="templates" className="space-y-4 mt-4">
            {configurations
              .filter(c => TEMPLATE_SOURCES.includes(c.source_type))
              .map(config => (
                <EmailTemplateEditor
                  key={config.id}
                  sourceType={config.source_type}
                  sourceLabel={SOURCE_LABELS[config.source_type] || config.source_type}
                  initialTemplate={config.user_email_template}
                  initialSubject={config.user_email_subject}
                  onSave={async (template, subject) => {
                    await updateConfiguration(config.id, { 
                      user_email_template: template,
                      user_email_subject: subject 
                    });
                  }}
                />
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="text-sm max-w-[200px] truncate" title={log.subject}>{log.subject}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(log.status)}
                              {log.error_message && (
                                <span className="text-xs text-destructive truncate max-w-[150px]" title={log.error_message}>
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendEmail(log)}
                                disabled={resending === log.id}
                                className="h-8"
                              >
                                {resending === log.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Renvoyer
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
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
