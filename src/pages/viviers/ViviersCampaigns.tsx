import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Plus, Play, BarChart3, Send, CheckCircle2, MoreHorizontal, Pause, Trash2, MousePointerClick, Eye, MessageSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LogoArc from '@/components/ui/LogoArc';
import { useVivierCampaigns, CAMPAIGN_STATUSES } from '@/hooks/viviers/useVivierCampaigns';
import { CreateCampaignDialog } from '@/components/viviers/CreateCampaignDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ViviersCampaigns() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { campaigns, stats, isLoading, deleteCampaign, updateStatus } = useVivierCampaigns();

  const preselectedListId = searchParams.get('listId') || undefined;
  const preselectedListName = searchParams.get('listName') || undefined;

  // Auto-open dialog if coming from a list
  useEffect(() => {
    if (preselectedListId) {
      setShowCreateDialog(true);
    }
  }, [preselectedListId]);

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campagnes Email</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">
              Gérez vos campagnes d'emailing vers les leads du vivier
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle campagne
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emails envoyés</p>
                  <p className="text-2xl font-bold">{stats.totalSent.toLocaleString('fr-FR')}</p>
                </div>
                <Send className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ouvertures</p>
                  <p className="text-2xl font-bold">{stats.totalOpens.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">{stats.avgOpenRate > 0 ? `${stats.avgOpenRate.toFixed(1)}%` : '-'}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clics</p>
                  <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">{stats.avgClickRate > 0 ? `${stats.avgClickRate.toFixed(1)}%` : '-'}</p>
                </div>
                <MousePointerClick className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Réponses</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalReplies}</p>
                  <p className="text-xs text-muted-foreground">{stats.avgReplyRate > 0 ? `${stats.avgReplyRate.toFixed(1)}%` : '-'}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Campagnes actives</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        {campaigns.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Vos campagnes</CardTitle>
              <CardDescription>{campaigns.length} campagne(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <div 
                      key={campaign.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => campaign.slug && navigate(`/viviers/campaigns/${campaign.slug}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate hover:underline">{campaign.name}</h4>
                          <Badge variant="outline" className="shrink-0">
                            <div className={`w-2 h-2 rounded-full mr-1.5 ${CAMPAIGN_STATUSES[campaign.status].color}`} />
                            {CAMPAIGN_STATUSES[campaign.status].label}
                          </Badge>
                          {campaign.instantly_campaign_id && (
                            <Badge variant="secondary" className="text-xs">Instantly</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{campaign.total_recipients?.toLocaleString('fr-FR') || 0} destinataires</span>
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" /> {campaign.sent_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {campaign.open_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" /> {campaign.click_count || 0}
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <MessageSquare className="w-3 h-3" /> {campaign.reply_count || 0}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {campaign.created_at && formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true, locale: fr })}
                          {campaign.last_synced_at && ` • Sync ${formatDistanceToNow(new Date(campaign.last_synced_at), { addSuffix: true, locale: fr })}`}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); campaign.slug && navigate(`/viviers/campaigns/${campaign.slug}`); }}>
                            <BarChart3 className="w-4 h-4 mr-2" /> Voir détails
                          </DropdownMenuItem>
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: campaign.id, status: 'running' }); }}>
                              <Play className="w-4 h-4 mr-2" /> Lancer
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'running' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: campaign.id, status: 'paused' }); }}>
                              <Pause className="w-4 h-4 mr-2" /> Pause
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteCampaign.mutate(campaign.id); }} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune campagne créée</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Créez votre première campagne email pour contacter les leads du vivier.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une campagne
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <CreateCampaignDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          preselectedListId={preselectedListId}
          preselectedListName={preselectedListName}
        />
      </div>
    </VivierLayout>
  );
}
