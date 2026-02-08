import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import ReactMarkdown from 'react-markdown';

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
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
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
              L'IA analysera vos projets, leads, transcriptions, contacts et CR de réunion
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
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>,
                      h2: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>,
                      h3: ({ children }) => <h4 className="text-sm font-medium mt-3 mb-1">{children}</h4>,
                      p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                      li: ({ children }) => <li className="text-sm ml-4">{children}</li>,
                      strong: ({ children }) => <strong className="text-foreground">{children}</strong>,
                      table: ({ children }) => <table className="w-full text-xs border-collapse my-2">{children}</table>,
                      th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted text-left font-medium">{children}</th>,
                      td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                      hr: () => <hr className="my-3 border-border" />,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 my-2 italic text-muted-foreground">{children}</blockquote>,
                    }}
                  >
                    {synthesis}
                  </ReactMarkdown>
                </div>
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
