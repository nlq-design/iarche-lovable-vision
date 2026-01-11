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
import { CampaignEmailEditor, type EmailTheme } from '@/components/viviers/campaigns/CampaignEmailEditor';
import { ImportRecipientsDialog } from '@/components/viviers/campaigns/ImportRecipientsDialog';
import { TestEmailDialog } from '@/components/viviers/campaigns/TestEmailDialog';
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
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-500', icon: Pencil },
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
  const { campaign, recipients, stats, isLoading, isError, updateCampaign, addRecipients } = useVivierCampaignDetail(slug);

  // State for dialogs
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  
  // State for inline editing
  const [editingContent, setEditingContent] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftTheme, setDraftTheme] = useState<EmailTheme>('bleu-nuit');
  const [isSaving, setIsSaving] = useState(false);

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
            <Button variant="outline" onClick={initializeEditor}>
              <Pencil className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button onClick={() => setShowTestDialog(true)}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer test
            </Button>
          </div>
        </div>

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
                    <div className="border rounded-lg p-6 bg-white">
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: campaign.html_content || campaign.body_html || '' 
                        }}
                      />
                    </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Analytics détaillées</CardTitle>
                <CardDescription>Performances de la campagne</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics en cours de développement</p>
                  <p className="text-sm">Les graphiques détaillés seront disponibles prochainement</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
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
          </TabsContent>
        </Tabs>
      </div>
    </CockpitLayout>
  );
}
