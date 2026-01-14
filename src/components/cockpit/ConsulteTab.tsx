import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  RefreshCw, 
  Users, 
  FolderOpen, 
  Package, 
  Mic, 
  FileText,
  User,
  ChevronRight,
  Clock,
  Loader2,
  AlertCircle,
  Link2,
  History,
  Upload,
  TrendingUp,
  StickyNote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEntityLinks, EntityType, ExtendedEntityType, LinkedEntity } from '@/hooks/cockpit/useEntityLinks';
import { ContextNotesTab } from './ContextNotesTab';
import type { ContextNoteEntityType } from '@/hooks/cockpit/useEntityContextNotes';

interface ConsulteTabProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  summary: string | null;
  onSynthesisComplete?: () => void;
}

const ENTITY_ICONS: Record<ExtendedEntityType, React.ReactNode> = {
  lead: <User className="h-4 w-4" />,
  project: <FolderOpen className="h-4 w-4" />,
  solution: <Package className="h-4 w-4" />,
  partner: <Users className="h-4 w-4" />,
  transcription: <Mic className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  opportunity: <TrendingUp className="h-4 w-4" />,
};

const ENTITY_LABELS: Record<ExtendedEntityType, string> = {
  lead: 'Leads',
  project: 'Projets',
  solution: 'Solutions',
  partner: 'Partenaires',
  transcription: 'Transcriptions',
  document: 'Documents',
  upload: 'Fichiers',
  opportunity: 'Opportunités',
};

const ENTITY_ROUTES: Record<ExtendedEntityType, string> = {
  lead: '/cockpit/leads',
  project: '/cockpit/projects',
  solution: '/cockpit/solutions',
  partner: '/cockpit/partenaires',
  transcription: '/cockpit/transcriptions',
  document: '/cockpit/documents',
  upload: '/cockpit/uploads',
  opportunity: '/cockpit/pipeline',
};

export function ConsulteTab({ 
  entityType, 
  entityId, 
  entityName,
  summary, 
  onSynthesisComplete 
}: ConsulteTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'history' | 'context'>('overview');
  const { links, totalCount, isLoading, refetch, isStale } = useEntityLinks(entityType, entityId);
  
  // Map EntityType to ContextNoteEntityType
  const contextEntityType: ContextNoteEntityType = entityType as ContextNoteEntityType;

  // Auto-refresh when stale
  useEffect(() => {
    if (isStale) {
      toast.info('Nouvelles liaisons détectées', { 
        description: 'Cliquez sur Actualiser pour mettre à jour la synthèse',
        duration: 5000 
      });
    }
  }, [isStale]);

  const handleGenerateSynthesis = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-entity-documents', {
        body: { 
          entity_type: entityType, 
          entity_id: entityId,
          use_consulte_prompt: true // Signal to use entity-specific prompt
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Synthèse générée (${data.documents_count || totalCount} sources)`);
        onSynthesisComplete?.();
        refetch();
      } else {
        toast.error(data?.message || 'Erreur lors de la synthèse');
      }
    } catch (error: any) {
      console.error('Synthesis error:', error);
      if (error.message?.includes('429')) {
        toast.error('Limite atteinte, réessayez dans quelques instants');
      } else if (error.message?.includes('402')) {
        toast.error('Crédits IA insuffisants');
      } else {
        toast.error('Erreur lors de la génération');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getEntityLink = (entity: LinkedEntity): string => {
    const baseRoute = ENTITY_ROUTES[entity.type];
    if (entity.slug) {
      return `${baseRoute}/${entity.slug}`;
    }
    return `${baseRoute}/${entity.id}`;
  };

  const renderLinkedEntities = (entities: LinkedEntity[], type: ExtendedEntityType) => {
    if (entities.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          {ENTITY_ICONS[type]}
          <span>{ENTITY_LABELS[type]} ({entities.length})</span>
        </div>
        {entities.map((entity) => (
          <Link
            key={entity.id}
            to={getEntityLink(entity)}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="text-muted-foreground">{ENTITY_ICONS[type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entity.name}</p>
                {(entity.context || entity.role) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entity.role && <span className="mr-2">Rôle: {entity.role}</span>}
                    {entity.context && <Badge variant="outline" className="text-xs">{entity.context}</Badge>}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    );
  };

  const allLinkedEntities: (LinkedEntity & { sortDate?: string })[] = [
    ...links.leads.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.projects.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.solutions.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.partners.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.transcriptions.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.documents.map(e => ({ ...e, sortDate: e.created_at })),
    ...links.uploads.map(e => ({ ...e, type: 'upload' as ExtendedEntityType, sortDate: e.created_at })),
  ].sort((a, b) => {
    if (!a.sortDate) return 1;
    if (!b.sortDate) return -1;
    return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Consulte
            <Badge variant="secondary" className="text-xs">
              {totalCount} liaison{totalCount > 1 ? 's' : ''}
            </Badge>
            {isStale && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Nouvelles données
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerateSynthesis}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {summary ? 'Actualiser' : 'Générer'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="overview" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Synthèse
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs">
              <Link2 className="h-3 w-3 mr-1" />
              Liaisons
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="context" className="text-xs">
              <StickyNote className="h-3 w-3 mr-1" />
              Contexte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3">
            {summary ? (
              <ScrollArea className="h-[300px]">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                <div 
                    className="text-sm text-muted-foreground whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        summary
                          .replace(/^### (.+)$/gm, '<h4 class="text-sm font-medium mt-3 mb-1">$1</h4>')
                          .replace(/^## (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-2">$1</h3>')
                          .replace(/^# (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-2">$1</h2>')
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.+?)\*/g, '<em>$1</em>')
                          .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>'),
                        { ADD_TAGS: ['h2', 'h3', 'h4', 'strong', 'em', 'li'], ADD_ATTR: ['class'] }
                      )
                    }}
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  {totalCount > 0 
                    ? `${totalCount} liaison${totalCount > 1 ? 's' : ''} disponible${totalCount > 1 ? 's' : ''}`
                    : 'Aucune liaison détectée'
                  }
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSynthesis}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Générer la synthèse
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalCount === 0 ? (
              <div className="text-center py-8">
                <Link2 className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucune liaison avec d'autres entités
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {renderLinkedEntities(links.leads, 'lead')}
                  {renderLinkedEntities(links.projects, 'project')}
                  {renderLinkedEntities(links.solutions, 'solution')}
                  {renderLinkedEntities(links.partners, 'partner')}
                  {renderLinkedEntities(links.transcriptions, 'transcription')}
                  {renderLinkedEntities(links.documents, 'document')}
                  {renderLinkedEntities(links.uploads, 'upload')}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allLinkedEntities.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun historique de liaisons
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {allLinkedEntities.slice(0, 20).map((entity, idx) => (
                    <Link
                      key={`${entity.type}-${entity.id}-${idx}`}
                      to={getEntityLink(entity)}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-muted-foreground">{ENTITY_ICONS[entity.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entity.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ENTITY_LABELS[entity.type]}
                          {entity.created_at && (
                            <span className="ml-2">
                              • {formatDistanceToNow(new Date(entity.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Context Notes Tab */}
          <TabsContent value="context" className="mt-3">
            <ContextNotesTab entityType={contextEntityType} entityId={entityId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
