import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Play,
  Pause,
  Trash2,
  RefreshCw,
  User,
  FolderOpen,
  Package,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useNavigate } from 'react-router-dom';

interface TranscriptionDetailSheetProps {
  transcriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TranscriptionDetailSheet({
  transcriptionId,
  open,
  onOpenChange,
}: TranscriptionDetailSheetProps) {
  const navigate = useNavigate();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { useTranscription, deleteTranscription, processTranscription } = useCockpitVoiceTranscriptions();
  const { data: transcription, isLoading, refetch } = useTranscription(transcriptionId || '');

  // Fetch signed URL for audio playback
  useEffect(() => {
    if (transcription?.storage_path) {
      supabase.storage
        .from('voice-transcriptions')
        .createSignedUrl(transcription.storage_path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setAudioUrl(data.signedUrl);
          }
        });
    }
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [transcription?.storage_path]);

  const handlePlayPause = () => {
    if (!audioUrl) return;
    
    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleRetry = () => {
    if (transcriptionId) {
      processTranscription.mutate(transcriptionId, {
        onSuccess: () => refetch(),
      });
    }
  };

  const handleDelete = () => {
    if (transcriptionId) {
      deleteTranscription.mutate(transcriptionId, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          onOpenChange(false);
        },
      });
    }
  };

  if (!transcriptionId) return null;

  const statusConfig = TRANSCRIPTION_STATUSES.find(s => s.value === transcription?.status);
  const summary = transcription?.summary;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg">
                  {isLoading ? 'Chargement...' : summary?.title || 'Transcription'}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3" />
                  {transcription?.created_at && 
                    format(new Date(transcription.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </SheetDescription>
              </div>
              {statusConfig && (
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-6">
                {/* Audio Player */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handlePlayPause}
                        disabled={!audioUrl}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Audio original</p>
                        <p className="text-xs text-muted-foreground">
                          {transcription?.source === 'upload' ? 'Fichier importé' : 'Enregistrement'}
                        </p>
                      </div>
                      {transcription?.status === 'error' && (
                        <Button size="sm" variant="outline" onClick={handleRetry}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Réessayer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Entity Links */}
                {(transcription?.lead || transcription?.project || transcription?.solution || transcription?.meeting_note) && (
                  <div className="flex flex-wrap gap-2">
                    {transcription.lead && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => {
                        onOpenChange(false);
                        navigate(`/cockpit/leads`);
                      }}>
                        <User className="h-3 w-3 mr-1" />
                        {transcription.lead.name}
                      </Badge>
                    )}
                    {transcription.project && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => {
                        onOpenChange(false);
                        navigate(`/cockpit/projects/${transcription.project!.id}`);
                      }}>
                        <FolderOpen className="h-3 w-3 mr-1" />
                        {transcription.project.name}
                      </Badge>
                    )}
                    {transcription.solution && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => {
                        onOpenChange(false);
                        navigate(`/cockpit/solutions/${transcription.solution!.id}`);
                      }}>
                        <Package className="h-3 w-3 mr-1" />
                        {transcription.solution.title}
                      </Badge>
                    )}
                    {transcription.meeting_note && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => {
                        onOpenChange(false);
                        navigate(`/cockpit/agenda`);
                      }}>
                        <FileText className="h-3 w-3 mr-1" />
                        {transcription.meeting_note.objectives 
                          ? transcription.meeting_note.objectives.substring(0, 30) + '...'
                          : 'Compte-rendu'
                        }
                      </Badge>
                    )}
                  </div>
                )}

                {/* Content Tabs */}
                {transcription?.status === 'done' && summary ? (
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="summary">Synthèse</TabsTrigger>
                      <TabsTrigger value="transcript">Transcription</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="space-y-4 pt-4">
                      {/* Executive Summary */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Résumé exécutif
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{summary.executive_summary}</p>
                        </CardContent>
                      </Card>

                      {/* Key Points */}
                      {summary.key_points?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Points clés</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {summary.key_points.map((point, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Decisions */}
                      {summary.decisions?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Décisions prises</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {summary.decisions.map((decision, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  {decision}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Risks & Blockers */}
                      {summary.risks_blockers?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                              <AlertTriangle className="h-4 w-4" />
                              Risques / Blocages
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {summary.risks_blockers.map((risk, i) => (
                                <li key={i} className="text-sm">{risk}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Questions Open */}
                      {summary.questions_open?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              Questions en suspens
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {summary.questions_open.map((q, i) => (
                                <li key={i} className="text-sm">{q}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {/* Next Steps */}
                      {summary.next_steps && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Prochaines étapes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{summary.next_steps}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Quality indicator */}
                      {summary.extraction_quality && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                          <span>Confiance IA: {summary.extraction_quality.confidence}%</span>
                          {summary.extraction_quality.uncertainties?.length > 0 && (
                            <span>{summary.extraction_quality.uncertainties.length} incertitude(s)</span>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="transcript" className="pt-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Transcription complète
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {transcription.raw_transcript || 'Transcription non disponible'}
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4 pt-4">
                      {summary.action_items?.length > 0 ? (
                        summary.action_items.map((action, i) => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{action.task}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    {action.owner && <span>👤 {action.owner}</span>}
                                    {action.due_date && <span>📅 {action.due_date}</span>}
                                  </div>
                                </div>
                                <Badge variant={
                                  action.priority === 'high' ? 'destructive' :
                                  action.priority === 'medium' ? 'default' : 'secondary'
                                }>
                                  {action.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Aucune action identifiée</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : transcription?.status === 'error' ? (
                  <Card className="border-destructive">
                    <CardContent className="p-6 text-center">
                      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Erreur de traitement</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {(transcription.ai_metadata as any)?.last_error || 'Une erreur est survenue'}
                      </p>
                      <Button onClick={handleRetry}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Réessayer
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Traitement en cours</h3>
                      <p className="text-sm text-muted-foreground">
                        {transcription?.status === 'transcribing' 
                          ? 'Transcription audio...'
                          : 'Analyse IA en cours...'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-background">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transcription ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La transcription et son audio seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
