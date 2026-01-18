import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Sparkles, 
  RefreshCw, 
  FolderKanban, 
  Users, 
  FileText, 
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { usePartnerConsulte } from '@/hooks/partner/usePartnerConsulte';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

export function PartnerConsulteSection() {
  const { 
    isLoading, 
    synthesis, 
    context, 
    error, 
    generateSynthesis, 
    clearSynthesis 
  } = usePartnerConsulte();
  
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = async () => {
    const success = await generateSynthesis();
    if (success) {
      toast.success('Synthèse générée avec succès');
      setIsExpanded(true);
    } else {
      toast.error('Échec de la génération');
    }
  };

  const formatMarkdownToHtml = (markdown: string): string => {
    // Simple markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-2">')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-4 border-border">');
    
    // Wrap in paragraph
    html = `<div class="prose prose-sm max-w-none dark:prose-invert"><p class="mb-2">${html}</p></div>`;
    
    return DOMPurify.sanitize(html);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Partner-Consulte
                <Badge variant="outline" className="text-xs font-normal">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </CardTitle>
              <CardDescription>
                Synthèse intelligente de vos missions et interactions
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {synthesis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant={synthesis ? 'outline' : 'default'}
              size="sm"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : synthesis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer la synthèse
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!synthesis && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Cliquez sur "Générer la synthèse" pour obtenir une vue 360° de vos missions</p>
            <p className="text-sm mt-1">
              L'IA analysera vos projets, leads et transcriptions associés
            </p>
          </div>
        )}

        {synthesis && !isLoading && (
          <div className="space-y-4">
            {/* Context Stats */}
            {context && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FolderKanban className="h-3 w-3" />
                  {context.projects_count} projet{context.projects_count > 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {context.leads_count} lead{context.leads_count > 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {context.transcriptions_count} transcription{context.transcriptions_count > 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {context.documents_count} document{context.documents_count > 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            {/* Synthesis Content */}
            {isExpanded && (
              <ScrollArea className="max-h-[500px] pr-4">
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(synthesis) }}
                />
              </ScrollArea>
            )}

            {!isExpanded && (
              <div className="text-sm text-muted-foreground">
                <p className="line-clamp-2">{synthesis.slice(0, 200)}...</p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-1"
                  onClick={() => setIsExpanded(true)}
                >
                  Voir la synthèse complète
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
