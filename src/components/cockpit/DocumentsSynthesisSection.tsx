import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentsSynthesisSectionProps {
  entityType: 'lead' | 'project' | 'solution' | 'document' | 'partner' | 'transcription';
  entityId: string;
  summary: string | null;
  documentsCount: number;
  onSynthesisComplete?: () => void;
}

export function DocumentsSynthesisSection({
  entityType,
  entityId,
  summary,
  documentsCount,
  onSynthesisComplete
}: DocumentsSynthesisSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerateSynthesis = async () => {
    // Allow synthesis even without documents - the backend can pull from transcriptions, tasks, etc.
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-entity-documents', {
        body: { entity_type: entityType, entity_id: entityId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Synthèse générée (${data.documents_count} documents)`);
        onSynthesisComplete?.();
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

  // Always show the synthesis section - it can synthesize from any linked entity (documents, transcriptions, tasks, etc.)
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Synthèse IA
            {documentsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {documentsCount} doc{documentsCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {summary && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
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
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {summary ? (
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
          ) : (
            <div className="text-center py-4">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">
                {documentsCount > 0 
                  ? `${documentsCount} document${documentsCount > 1 ? 's' : ''} lié${documentsCount > 1 ? 's' : ''}`
                  : 'Aucune synthèse disponible'
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
        </CardContent>
      )}
    </Card>
  );
}
