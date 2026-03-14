import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { NormalizedSummary } from '../shared/normalizeSummary';
import {
  TranscriptionSummaryTab,
  TranscriptionActionsTab,
  TranscriptionEnrichedTab,
  SimpleTranscript,
} from '../shared';
import { ConsulteTab } from '@/components/cockpit/ConsulteTab';
import type { TranscriptionParticipant } from '@/hooks/cockpit/useTranscriptionParticipants';

interface TranscriptionContentTabsProps {
  transcriptionId: string;
  status: string;
  summary: NormalizedSummary | null;
  rawTranscript: string | null;
  segments: Record<string, unknown> | null;
  languageDetected: string | null;
  leadId: string | null;
  projectId: string | null;
  displayTitle: string;
  aiDocumentsSummary: string | null;
  persistedParticipants: TranscriptionParticipant[];
  isProcessing: boolean;
  onRetry: () => void;
  onReanalyze: () => void;
  onRefetch: () => void;
  onCreateTask: (task: any) => void;
  onSeekAudio: (timeMs: number) => void;
  aiMetadata?: unknown;
}

export function TranscriptionContentTabs({
  transcriptionId,
  status,
  summary,
  rawTranscript,
  segments,
  languageDetected,
  leadId,
  projectId,
  displayTitle,
  aiDocumentsSummary,
  persistedParticipants,
  isProcessing,
  onRetry,
  onReanalyze,
  onRefetch,
  onCreateTask,
  onSeekAudio,
  aiMetadata,
}: TranscriptionContentTabsProps) {
  if ((status === 'done' || status === 'analyzing') && summary) {
    return (
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Résumé</TabsTrigger>
          <TabsTrigger value="actions">Actions ({summary.action_items?.length || 0})</TabsTrigger>
          <TabsTrigger value="enriched">Enrichi</TabsTrigger>
          <TabsTrigger value="transcript">Transcription</TabsTrigger>
          <TabsTrigger value="consulte">Consulte</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 pt-4">
          <TranscriptionSummaryTab summary={summary} persistedParticipants={persistedParticipants} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4 pt-4">
          <TranscriptionActionsTab
            actionItems={summary.action_items || []}
            transcriptionId={transcriptionId}
            leadId={leadId}
            projectId={projectId}
            onCreateTask={onCreateTask}
          />
        </TabsContent>

        <TabsContent value="enriched" className="space-y-4 pt-4">
          <TranscriptionEnrichedTab
            segments={segments}
            languageDetected={languageDetected}
            onSeekTo={onSeekAudio}
          />
        </TabsContent>

        <TabsContent value="transcript" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcription complète
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleTranscript text={rawTranscript || ''} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consulte">
          <ConsulteTab
            entityType="transcription"
            entityId={transcriptionId}
            entityName={displayTitle}
            summary={aiDocumentsSummary}
            onSynthesisComplete={onRefetch}
          />
        </TabsContent>
      </Tabs>
    );
  }

  if (status === 'error') {
    return <ErrorCard aiMetadata={aiMetadata} onRetry={onRetry} isProcessing={isProcessing} />;
  }

  if (status === 'done' && !summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Pas de résumé disponible. Le texte brut est accessible ci-dessous.
          </p>
          <Button size="sm" onClick={onReanalyze} disabled={isProcessing}>
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse en cours...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Ré-analyser</>
            )}
          </Button>
          {rawTranscript && (
            <Card className="mt-4 text-left">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcription complète
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTranscript text={rawTranscript} />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {status === 'transcribing' ? 'Transcription en cours...' : 'Analyse en cours...'}
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ aiMetadata, onRetry, isProcessing }: { aiMetadata?: unknown; onRetry: () => void; isProcessing: boolean }) {
  const meta = (aiMetadata as any) ?? {};
  const lastError = String(meta.last_error || meta.assemblyai_error || meta.reason || '');

  const errorMessages: Record<string, { title: string; description: string }> = {
    too_large: { title: 'Fichier trop volumineux', description: 'Le fichier dépasse la limite autorisée (500 MB).' },
    timeout: { title: 'Traitement expiré', description: 'Le traitement a dépassé le délai. Réessayez — le worker relancera automatiquement.' },
    stale: { title: 'Traitement bloqué', description: 'Le job est resté inactif trop longtemps et a été marqué en erreur.' },
  };

  const matchedKey = Object.keys(errorMessages).find(k => lastError.toLowerCase().includes(k));
  const msg = matchedKey ? errorMessages[matchedKey] : { title: 'Erreur de traitement', description: lastError || 'Une erreur est survenue' };

  return (
    <Card className="border-destructive">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-medium mb-2">{msg.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{msg.description}</p>
        <Button onClick={onRetry} disabled={isProcessing}>
          {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}
