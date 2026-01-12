import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { useVivierCampaignDetail } from '@/hooks/useVivierCampaignDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CampaignEmailEditor, type EmailTheme } from '@/components/viviers/campaigns/CampaignEmailEditor';
import { ImportRecipientsDialog } from '@/components/viviers/campaigns/ImportRecipientsDialog';
import { TestEmailDialog } from '@/components/viviers/campaigns/TestEmailDialog';
import { CampaignScheduler } from '@/components/viviers/campaigns/CampaignScheduler';
import { CampaignAnalyticsChart } from '@/components/viviers/campaigns/CampaignAnalyticsChart';
import { useCampaignExport } from '@/components/viviers/campaigns/useCampaignExport';
import { EmailPreviewRenderer } from '@/components/viviers/campaigns/EmailPreviewRenderer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Mail, 
  Users, 
  BarChart3, 
  Settings, 
  Send, 
  Eye, 
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Pencil,
  Play,
  Pause,
  RefreshCw,
  Plus,
  Save,
  Zap,
  Upload,
  Rocket,
  Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-500', icon: Pencil },
  created: { label: 'Créée', color: 'bg-blue-500', icon: Link2 },
  pending: { label: 'En attente', color: 'bg-yellow-500', icon: Clock },
  active: { label: 'Active', color: 'bg-green-500', icon: Play },
  paused: { label: 'Pause', color: 'bg-orange-500', icon: Pause },
  completed: { label: 'Terminée', color: 'bg-blue-500', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-500', icon: XCircle },
};

const RECIPIENT_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  draft: { label: 'Brouillon', variant: 'outline' },
  sent: { label: 'Envoyé', variant: 'default' },
  opened: { label: 'Ouvert', variant: 'default' },
  clicked: { label: 'Cliqué', variant: 'default' },
  replied: { label: 'Répondu', variant: 'default' },
  bounced: { label: 'Bounce', variant: 'destructive' },
};

export default function VivierCampaignDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { campaign, recipients, stats, isLoading, isError, updateCampaign, addRecipients, refetch } = useVivierCampaignDetail(slug);
  const { exportRecipientsCsv } = useCampaignExport();

  // State for dialogs
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  
  // State for inline editing
  const [editingContent, setEditingContent] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftTheme, setDraftTheme] = useState<EmailTheme>('bleu-nuit');
  const [isSaving, setIsSaving] = useState(false);

  // Instantly integration states
  const [instantlyLoading, setInstantlyLoading] = useState<string | null>(null);

  // Initialize draft content from campaign
  const initializeEditor = () => {
    if (campaign) {
      setDraftSubject(campaign.subject || '');
      setDraftBody(campaign.html_content || campaign.body_html || '');
      setDraftTheme((campaign.template_theme as EmailTheme) || 'bleu-nuit');
      setEditingContent(true);
    }
  };

  // Save content changes
  const saveContent = async () => {
    setIsSaving(true);
    try {
      await updateCampaign.mutateAsync({
        subject: draftSubject,
        html_content: draftBody,
        template_theme: draftTheme,
      });
      setEditingContent(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Import recipients handler
  const handleImportRecipients = async (newRecipients: Array<{ email: string; name?: string; company?: string }>) => {
    return addRecipients.mutateAsync(newRecipients);
  };

  // Instantly API actions
  const callInstantlyAction = async (action: string) => {
    if (!campaign) return;
    
    setInstantlyLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('send-instantly-campaign', {
        body: { campaign_id: campaign.id, action }
      });

      if (error) throw error;

      switch (action) {
        case 'create':
          toast.success('Campagne créée dans Instantly');
          break;
        case 'add_leads':
          toast.success(`${data.added || 0} leads ajoutés à Instantly`);
          break;
        case 'launch':
          toast.success('Campagne lancée !');
          break;
        case 'pause':
          toast.success('Campagne mise en pause');
          break;
        case 'status':
          toast.info('Statut synchronisé');
          break;
      }
      
      refetch();
    } catch (error) {
      console.error('Instantly action error:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Action échouée'}`);
    } finally {
      setInstantlyLoading(null);
    }
  };

  if (isLoading) {
    return (
      <CockpitLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </CockpitLayout>
    );
  }

  if (isError || !campaign) {
    return (
      <CockpitLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-medium">Campagne introuvable</p>
          <Button variant="outline" onClick={() => navigate('/viviers/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux campagnes
          </Button>
        </div>
      </CockpitLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const getRecipientDisplayName = (r: typeof recipients[0]) => {
    if (r.name) return r.name;
    if (r.first_name || r.last_name) return `${r.first_name || ''} ${r.last_name || ''}`.trim();
    return r.email.split('@')[0];
  };

  const getRecipientStatus = (r: typeof recipients[0]) => {
    if (r.replied_at) return 'replied';
    if (r.clicked_at) return 'clicked';
    if (r.opened_at) return 'opened';
    if (r.bounced_at) return 'bounced';
    if (r.sent_at) return 'sent';
    return r.status || 'pending';
  };

  return (
    <CockpitLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/viviers/campaigns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <Badge className={`${statusConfig.color} text-white`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {campaign.subject || 'Aucun sujet défini'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTestDialog(true)}>
              <Send className="w-4 h-4 mr-2" />
              Test
            </Button>
            {!campaign.instantly_campaign_id ? (
              <Button 
                onClick={() => callInstantlyAction('create')}
                disabled={instantlyLoading === 'create'}
              >
                {instantlyLoading === 'create' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Créer dans Instantly
              </Button>
            ) : campaign.status === 'active' ? (
              <Button 
                variant="outline"
                onClick={() => callInstantlyAction('pause')}
                disabled={instantlyLoading === 'pause'}
              >
                {instantlyLoading === 'pause' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                Pause
              </Button>
            ) : (
              <Button 
                onClick={() => callInstantlyAction('launch')}
                disabled={instantlyLoading === 'launch' || stats.total === 0}
              >
                {instantlyLoading === 'launch' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                Lancer
              </Button>
            )}
          </div>
        </div>

        {/* Instantly Status Banner */}
        {campaign.instantly_campaign_id && (
          <Alert className="border-blue-200 bg-blue-50">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-800">
                Connectée à Instantly • ID: <code className="text-xs bg-blue-100 px-1 rounded">{campaign.instantly_campaign_id}</code>
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => callInstantlyAction('add_leads')}
                  disabled={instantlyLoading === 'add_leads'}
                >
                  {instantlyLoading === 'add_leads' ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}
                  Sync leads
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => callInstantlyAction('status')}
                  disabled={instantlyLoading === 'status'}
                >
                  {instantlyLoading === 'status' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import & Test Dialogs */}
        <ImportRecipientsDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={handleImportRecipients}
          existingEmails={recipients.map(r => r.email)}
        />
        <TestEmailDialog
          open={showTestDialog}
          onOpenChange={setShowTestDialog}
          campaignId={campaign.id}
          campaignName={campaign.name}
          subject={campaign.subject || ''}
          htmlContent={campaign.html_content || campaign.body_html || ''}
          theme={(campaign.template_theme as EmailTheme) || 'bleu-nuit'}
          senderName={campaign.sender_name || undefined}
          senderEmail={campaign.sender_email || undefined}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Recipients</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{stats.pending} en attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Ouvertures</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.opened} / {stats.sent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Clics</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.clickRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.clicked} clics</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Réponses</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.replyRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.replied} réponses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Bounces</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.bounceRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.bounced} échecs</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contenu
            </TabsTrigger>
            <TabsTrigger value="recipients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Recipients ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-4">
            {editingContent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Édition du contenu</CardTitle>
                      <CardDescription>
                        Modifiez le sujet et le corps de votre email
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setEditingContent(false)}>
                        Annuler
                      </Button>
                      <Button onClick={saveContent} disabled={isSaving}>
                        {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CampaignEmailEditor
                    subject={draftSubject}
                    bodyHtml={draftBody}
                    theme={draftTheme}
                    onSubjectChange={setDraftSubject}
                    onBodyChange={setDraftBody}
                    onThemeChange={setDraftTheme}
                    senderName={campaign.sender_name || 'IArche'}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Aperçu de l'email</CardTitle>
                      <CardDescription>
                        Sujet : {campaign.subject || 'Non défini'}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={initializeEditor}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.body_html || campaign.html_content ? (
                    <EmailPreviewRenderer
                      bodyHtml={campaign.html_content || campaign.body_html || ''}
                      theme={(campaign.template_theme as EmailTheme) || 'bleu-nuit'}
                      senderName={campaign.sender_name || 'IArche'}
                      subject={campaign.subject || undefined}
                      previewVariables={{
                        '{{first_name}}': 'Jean',
                        '{{last_name}}': 'Dupont',
                        '{{name}}': 'Jean Dupont',
                        '{{email}}': 'jean.dupont@example.com',
                        '{{company}}': 'Entreprise Test',
                        '{{unsubscribe_url}}': '#',
                      }}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun contenu défini</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={initializeEditor}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Créer le contenu
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Liste des recipients</CardTitle>
                    <CardDescription>{stats.total} contacts dans cette campagne</CardDescription>
                  </div>
                  <Button onClick={() => setShowImportDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Importer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recipients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun recipient</p>
                    <p className="text-sm">Importez des contacts pour lancer cette campagne</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Dernière activité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.slice(0, 50).map((recipient) => {
                        const status = getRecipientStatus(recipient);
                        const statusConfig = RECIPIENT_STATUS_CONFIG[status] || RECIPIENT_STATUS_CONFIG.pending;
                        const lastActivity = recipient.replied_at || recipient.clicked_at || recipient.opened_at || recipient.sent_at;
                        
                        return (
                          <TableRow key={recipient.id}>
                            <TableCell className="font-medium">{recipient.email}</TableCell>
                            <TableCell>{getRecipientDisplayName(recipient)}</TableCell>
                            <TableCell>{recipient.company || recipient.company_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={statusConfig.variant}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {lastActivity 
                                ? format(new Date(lastActivity), 'dd/MM/yyyy HH:mm', { locale: fr })
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                {recipients.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Affichage des 50 premiers sur {recipients.length}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4">
            <CampaignAnalyticsChart
              recipients={recipients}
              stats={stats}
              campaignName={campaign.name}
              onExport={() => exportRecipientsCsv(recipients, campaign, stats)}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Schedule Card */}
            <CampaignScheduler
              schedule={{
                days: (campaign.schedule_days as Record<number, boolean>) || { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false },
                timezone: campaign.schedule_timezone || 'Europe/Paris',
                timing: {
                  from: campaign.schedule_from || '09:00',
                  to: campaign.schedule_to || '18:00',
                },
              }}
              onSave={async (schedule) => {
                await updateCampaign.mutateAsync({
                  schedule_days: schedule.days,
                  schedule_timezone: schedule.timezone,
                  schedule_from: schedule.timing.from,
                  schedule_to: schedule.timing.to,
                });
              }}
              disabled={campaign.status === 'active'}
            />

            <Card>
              <CardHeader>
                <CardTitle>Paramètres de la campagne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Expéditeur</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Nom : {campaign.sender_name || 'IArche'}</p>
                      <p>Email : {campaign.sender_email || 'Non configuré'}</p>
                      <p>Réponse à : {campaign.reply_to || 'Non configuré'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Envoi</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Limite quotidienne : {campaign.daily_limit} emails/jour</p>
                      <p>Thème : {campaign.template_theme || 'bleu-nuit'}</p>
                      {campaign.scheduled_at && (
                        <p>Planifié : {format(new Date(campaign.scheduled_at), 'PPp', { locale: fr })}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instantly Integration Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <CardTitle>Intégration Instantly</CardTitle>
                </div>
                <CardDescription>
                  Synchronisation avec la plateforme d'envoi cold email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Statut de synchronisation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ID Instantly</span>
                        <span className="font-mono text-xs">
                          {campaign.instantly_campaign_id || 'Non créée'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Statut</span>
                        <Badge variant={campaign.instantly_campaign_id ? 'default' : 'secondary'}>
                          {campaign.instantly_campaign_id ? 'Connectée' : 'Non connectée'}
                        </Badge>
                      </div>
                      {campaign.last_synced_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Dernière sync</span>
                          <span className="text-xs">
                            {format(new Date(campaign.last_synced_at), 'dd/MM HH:mm', { locale: fr })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Actions</h4>
                    <div className="space-y-2">
                      {!campaign.instantly_campaign_id ? (
                        <Button 
                          className="w-full"
                          onClick={() => callInstantlyAction('create')}
                          disabled={instantlyLoading === 'create'}
                        >
                          {instantlyLoading === 'create' ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Créer dans Instantly
                        </Button>
                      ) : (
                        <>
                          <Button 
                            className="w-full"
                            variant="outline"
                            onClick={() => callInstantlyAction('add_leads')}
                            disabled={instantlyLoading === 'add_leads'}
                          >
                            {instantlyLoading === 'add_leads' ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Synchroniser les leads ({stats.total})
                          </Button>
                          {campaign.status === 'active' ? (
                            <Button 
                              className="w-full"
                              variant="destructive"
                              onClick={() => callInstantlyAction('pause')}
                              disabled={instantlyLoading === 'pause'}
                            >
                              {instantlyLoading === 'pause' ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4 mr-2" />
                              )}
                              Mettre en pause
                            </Button>
                          ) : (
                            <Button 
                              className="w-full"
                              onClick={() => callInstantlyAction('launch')}
                              disabled={instantlyLoading === 'launch' || stats.total === 0}
                            >
                              {instantlyLoading === 'launch' ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Rocket className="w-4 h-4 mr-2" />
                              )}
                              Lancer la campagne
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CockpitLayout>
  );
}
