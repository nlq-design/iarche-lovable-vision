import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Trash2,
  Calendar,
  Sparkles,
  Loader2,
  FileText,
  Mail,
  Check,
  X,
  ArrowLeft,
  MessageSquareText,
  Scissors,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeadContacts } from '@/hooks/cockpit/useCockpitLeadContacts';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { toast } from 'sonner';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';
import { ConsulteTab } from '@/components/cockpit/ConsulteTab';
import { useQuery } from '@tanstack/react-query';
import { transcribeLargeAudio, type TranscriptionProgress } from '@/lib/audioChunking';

// Shared components
import {
  TranscriptionSummaryTab,
  TranscriptionActionsTab,
  TranscriptionAudioPlayer,
  SimpleTranscript,
  normalizeSummary,
  TranscriptionEntityLinks,
  TranscriptionEmailDialog,
  TranscriptionEnrichedTab,
  TranscriptionParticipantsSection,
} from '@/components/cockpit/transcriptions/shared';

// Parse segments JSON (stored as stringified JSON or object)
function parseEnrichedSegments(segments: unknown): Record<string, unknown> | null {
  if (!segments) return null;
  if (typeof segments === 'string') {
    try { return JSON.parse(segments); } catch { return null; }
  }
  if (typeof segments === 'object') return segments as Record<string, unknown>;
  return null;
}

export default function CockpitTranscriptionDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  // Dynamic file metadata (for legacy transcriptions without stored metadata)
  const [dynamicDuration, setDynamicDuration] = useState<number | null>(null);
  const [dynamicFileSize, setDynamicFileSize] = useState<number | null>(null);

  const { useTranscription, deleteTranscription, processTranscription, updateTranscription, transcriptions, isLoading: listLoading } = useCockpitVoiceTranscriptions();

  // Find transcription id from slug or id — wait for list to load to avoid passing slug as UUID
  const resolvedId = transcriptions.find(t => t.slug === slug || t.id === slug)?.id;
  const transcriptionId = resolvedId || '';
  const { data: transcription, isLoading, refetch } = useTranscription(transcriptionId);

  const { leads } = useCockpitLeads();
  const { projects } = useCockpitProjects();
  const { createTask } = useCockpitTasks();

  const { contacts: leadContacts = [] } = useCockpitLeadContacts(transcription?.lead_id || undefined);

  const { data: solutions = [] } = useQuery({
    queryKey: ['cockpit-solutions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug')
        .eq('resource_type', 'solution')
        .eq('published', true)
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Editable title state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Editable date state
  const [editingDate, setEditingDate] = useState(false);

  // Analysis context state
  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState('');

  // Chunking retry state (for transcription timeout recovery)
  const [isChunkingRetry, setIsChunkingRetry] = useState(false);
  const [chunkingProgress, setChunkingProgress] = useState<TranscriptionProgress | null>(null);

  // Auto-start processing for queued transcriptions
  const autoStartForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!transcription?.id) return;
    if (transcription.status !== 'queued') return;
    if (autoStartForIdRef.current === transcription.id) return;

    autoStartForIdRef.current = transcription.id;
    toast.info('Lancement du traitement de la transcription...');
    processTranscription.mutate({ jobId: transcription.id }, { onSuccess: () => refetch() });
  }, [transcription?.id, transcription?.status]);

  useEffect(() => {
    if (transcription) {
      const displayTitle = transcription.title || (transcription.summary?.title as string) || '';
      setTitleDraft(typeof displayTitle === 'string' ? displayTitle : JSON.stringify(displayTitle));
      setContextDraft(transcription.analysis_context || '');
    }
  }, [transcription]);

  // Fetch audio URL and dynamic metadata - try multiple buckets
  useEffect(() => {
    setAudioUrl(null);
    setDynamicDuration(null);
    setDynamicFileSize(null);

    if (!transcriptionId || !transcription?.storage_path) return;
    
    // Skip if file was chunked and not preserved (ends with _no_file)
    if (transcription.storage_path.endsWith('_no_file')) {
      console.log('[Audio] Chunked file not preserved, audio unavailable');
      return;
    }

    const fetchSignedUrl = async () => {
      // Try primary bucket first
      const { data: primaryData, error: primaryError } = await supabase.storage
        .from('voice-transcriptions')
        .createSignedUrl(transcription.storage_path, 3600);

      if (!primaryError && primaryData?.signedUrl) {
        return primaryData.signedUrl;
      }

      // Fallback to cockpit-uploads bucket
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('cockpit-uploads')
        .createSignedUrl(transcription.storage_path, 3600);

      if (!fallbackError && fallbackData?.signedUrl) {
        return fallbackData.signedUrl;
      }

      console.error('[Audio] Failed to get signed URL from both buckets:', primaryError, fallbackError);
      return null;
    };

    fetchSignedUrl().then((signedUrl) => {
      if (!signedUrl) return;
      
      setAudioUrl(signedUrl);
      
      // If no stored metadata, try to get it dynamically
      if (!transcription.duration_seconds || !transcription.file_size_bytes) {
        fetch(signedUrl, { method: 'HEAD' })
          .then(res => {
            const contentLength = res.headers.get('content-length');
            if (contentLength && !transcription.file_size_bytes) {
              setDynamicFileSize(parseInt(contentLength, 10));
            }
          })
          .catch(() => {});
        
        if (!transcription.duration_seconds) {
          const tempAudio = new Audio();
          tempAudio.addEventListener('loadedmetadata', () => {
            if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
              setDynamicDuration(Math.round(tempAudio.duration));
            }
          });
          tempAudio.src = signedUrl;
          tempAudio.load();
        }
      }
    });
  }, [transcriptionId, transcription?.storage_path, transcription?.duration_seconds, transcription?.file_size_bytes]);

  const handleRetry = () => {
    if (transcription?.id) {
      processTranscription.mutate({ jobId: transcription.id }, { onSuccess: () => refetch() });
    } else {
      toast.error('Transcription non trouvée');
    }
  };

  const handleReanalyze = () => {
    if (transcription?.id) {
      toast.info('Ré-analyse en cours...');
      processTranscription.mutate({ jobId: transcription.id, forceRetranscribe: true }, {
        onSuccess: () => {
          refetch();
          toast.success('Synthèse et actions régénérées');
        },
      });
    } else {
      toast.error('Transcription non trouvée');
    }
  };

  const handleRetryWithChunking = async () => {
    if (!transcription || !audioUrl) {
      toast.error('Audio non disponible');
      return;
    }

    setIsChunkingRetry(true);
    setChunkingProgress({ phase: 'loading', message: 'Téléchargement de l\'audio...' });

    try {
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) throw new Error('Impossible de récupérer le fichier audio');
      const audioBlob = await audioRes.blob();

      const transcriptText = await transcribeLargeAudio(
        audioBlob,
        'fr',
        (progress) => setChunkingProgress(progress)
      );

      const { error: updateError } = await supabase
        .from('voice_transcriptions')
        .update({
          raw_transcript: transcriptText,
          status: 'analyzing',
          ai_metadata: {
            ...(transcription.ai_metadata || {}),
            chunked_client_side: true,
            retry_with_chunking: true,
            chunked_at: new Date().toISOString(),
            last_error: null,
          },
        })
        .eq('id', transcription.id);

      if (updateError) throw updateError;

      processTranscription.mutate({ jobId: transcription.id }, {
        onSuccess: () => {
          refetch();
          toast.success('Transcription découpée avec succès, analyse en cours...');
        },
      });

    } catch (err) {
      console.error('Chunking retry error:', err);
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Échec du découpage'}`);
    } finally {
      setIsChunkingRetry(false);
      setChunkingProgress(null);
    }
  };

  const handleDelete = () => {
    if (transcriptionId) {
      deleteTranscription.mutate(transcriptionId, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          navigate('/cockpit/transcriptions');
        },
      });
    }
  };

  const handleSaveTitle = () => {
    if (transcriptionId && titleDraft.trim()) {
      updateTranscription.mutate({ id: transcriptionId, updates: { title: titleDraft.trim() } });
      setEditingTitle(false);
    }
  };

  const handleSaveDate = (date: Date | undefined) => {
    if (transcriptionId && date) {
      updateTranscription.mutate({
        id: transcriptionId,
        updates: { transcription_date: format(date, 'yyyy-MM-dd') },
      });
      setEditingDate(false);
    }
  };

  const handleSaveContext = () => {
    if (transcriptionId) {
      updateTranscription.mutate({ id: transcriptionId, updates: { analysis_context: contextDraft.trim() || null } });
      setEditingContext(false);
    }
  };

  const handleReanalyzeWithContext = () => {
    if (transcriptionId) {
      const contextToSave = contextDraft.trim() || null;
      if (contextToSave !== transcription?.analysis_context) {
        updateTranscription.mutate({ id: transcriptionId, updates: { analysis_context: contextToSave } });
      }
      toast.info('Ré-analyse en cours avec le nouveau contexte...');
      processTranscription.mutate({ jobId: transcriptionId, forceRetranscribe: true }, {
        onSuccess: () => {
          refetch();
          toast.success('Synthèse et actions régénérées');
        },
      });
      setEditingContext(false);
    }
  };

  const handleUpdateTranscription = (updates: Record<string, string | null>) => {
    if (transcriptionId) {
      updateTranscription.mutate({ id: transcriptionId, updates });
    }
  };

  // Redirect if not found after loading
  useEffect(() => {
    if (!listLoading && !isLoading && !transcription && slug) {
      toast.error('Transcription introuvable');
      navigate('/cockpit/transcriptions', { replace: true });
    }
  }, [listLoading, isLoading, transcription, slug, navigate]);

  if (isLoading || listLoading) {
    return (
      <CockpitLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CockpitLayout>
    );
  }

  if (!transcription) {
    return null;
  }

  const statusConfig = TRANSCRIPTION_STATUSES.find(s => s.value === transcription.status);
  const summary = normalizeSummary(transcription.summary);
  const displayTitle = transcription.title || (summary?.title ? (typeof summary.title === 'string' ? summary.title : JSON.stringify(summary.title)) : 'Transcription');

  return (
    <CockpitLayout>
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/cockpit/transcriptions')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="h-8 text-lg font-semibold"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTitle(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h1
                  className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingTitle(true)}
                  title="Cliquer pour modifier"
                >
                  {displayTitle}
                </h1>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {editingDate ? (
                  <Popover open={editingDate} onOpenChange={setEditingDate}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {transcription.transcription_date
                          ? format(new Date(transcription.transcription_date), 'dd MMM yyyy', { locale: fr })
                          : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={transcription.transcription_date ? new Date(transcription.transcription_date) : undefined}
                        onSelect={handleSaveDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span
                    className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setEditingDate(true)}
                    title="Cliquer pour modifier la date"
                  >
                    <Calendar className="h-3 w-3" />
                    {transcription.transcription_date
                      ? format(new Date(transcription.transcription_date), 'dd MMMM yyyy', { locale: fr })
                      : transcription.created_at && format(new Date(transcription.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusConfig && <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>}
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Audio Player */}
        <TranscriptionAudioPlayer
          audioUrl={audioUrl}
          originalFilename={transcription.original_filename || undefined}
          source={transcription.source as 'upload' | 'recording' | undefined}
          fileSizeBytes={transcription.file_size_bytes || dynamicFileSize}
          durationSeconds={transcription.duration_seconds || dynamicDuration}
          audioFormat={transcription.audio_format}
          status={transcription.status}
          createdAt={transcription.created_at || undefined}
          updatedAt={transcription.updated_at || undefined}
          onRetry={handleRetry}
          onReanalyze={handleReanalyze}
          isProcessing={processTranscription.isPending}
        />

        {/* Analysis Context */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" />
              Contexte d'analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {editingContext ? (
              <div className="space-y-3">
                <Textarea
                  value={contextDraft}
                  onChange={(e) => setContextDraft(e.target.value)}
                  placeholder="Ajoutez du contexte pour améliorer l'analyse IA (ex: c'est un RDV de découverte avec un prospect du secteur santé...)"
                  rows={3}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleReanalyzeWithContext} disabled={processTranscription.isPending}>
                    {processTranscription.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Sauvegarder et ré-analyser
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSaveContext}>
                    <Check className="h-4 w-4 mr-2" />
                    Sauvegarder seulement
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setContextDraft(transcription.analysis_context || '');
                    setEditingContext(false);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer p-2 -m-2 rounded hover:bg-muted/50 transition-colors"
                onClick={() => setEditingContext(true)}
              >
                {transcription.analysis_context ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcription.analysis_context}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Cliquer pour ajouter du contexte à l'analyse IA...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity Links */}
        <TranscriptionEntityLinks
          transcriptionId={transcriptionId}
          lead={transcription.lead}
          leadContact={transcription.lead_contact}
          project={transcription.project}
          solution={transcription.solution}
          meetingNote={transcription.meeting_note}
          leads={leads}
          projects={projects}
          solutions={solutions.map(s => ({ id: s.id, title: s.title }))}
          leadContacts={leadContacts}
          onUpdate={handleUpdateTranscription}
          onNavigate={navigate}
        />

        {/* Participants */}
        <TranscriptionParticipantsSection
          transcriptionId={transcriptionId}
          normalizedSummary={summary}
        />

        {/* Partners */}
        <LinkedPartnersSection
          entityType="transcription"
          entityId={transcriptionId}
        />

        {/* Content Tabs */}
        {(transcription.status === 'done' || transcription.status === 'analyzing') && summary ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Résumé</TabsTrigger>
              <TabsTrigger value="actions">Actions ({summary.action_items?.length || 0})</TabsTrigger>
              <TabsTrigger value="enriched">Enrichi</TabsTrigger>
              <TabsTrigger value="transcript">Transcription</TabsTrigger>
              <TabsTrigger value="consulte">Consulte</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 pt-4">
              <TranscriptionSummaryTab summary={summary} />
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 pt-4">
              <TranscriptionActionsTab
                actionItems={summary.action_items || []}
                transcriptionId={transcriptionId}
                leadId={transcription.lead_id}
                projectId={transcription.project_id}
                onCreateTask={(task) => createTask.mutate(task)}
              />
            </TabsContent>

            <TabsContent value="enriched" className="space-y-4 pt-4">
              <TranscriptionEnrichedTab
                segments={parseEnrichedSegments(transcription.segments)}
                languageDetected={(transcription.ai_metadata as any)?.language_detected}
                onSeekTo={(timeMs) => {
                  const audioEl = document.querySelector('audio');
                  if (audioEl) {
                    audioEl.currentTime = timeMs / 1000;
                    audioEl.play();
                  }
                }}
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
                  <SimpleTranscript text={transcription.raw_transcript || ''} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consulte">
              <ConsulteTab
                entityType="transcription"
                entityId={transcriptionId}
                entityName={displayTitle}
                summary={transcription.ai_documents_summary || null}
                onSynthesisComplete={() => refetch()}
              />
            </TabsContent>
          </Tabs>
        ) : transcription.status === 'error' ? (
          <ErrorCard
            transcription={transcription}
            onRetry={handleRetry}
            onRetryWithChunking={handleRetryWithChunking}
            isProcessing={processTranscription.isPending}
            isChunkingRetry={isChunkingRetry}
            chunkingProgress={chunkingProgress}
          />
        ) : transcription.status === 'done' && !summary ? (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Pas de résumé disponible. Le texte brut est accessible ci-dessous.
              </p>
              <Button size="sm" onClick={handleReanalyze} disabled={processTranscription.isPending}>
                {processTranscription.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse en cours...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Ré-analyser</>
                )}
              </Button>
              {transcription.raw_transcript && (
                <Card className="mt-4 text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Transcription complète
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleTranscript text={transcription.raw_transcript} />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {transcription.status === 'transcribing' ? 'Transcription en cours...' : 'Analyse en cours...'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transcription ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier audio et toutes les données associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Dialog */}
      <TranscriptionEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        transcriptionId={transcriptionId}
        leadId={transcription.lead_id}
        leadName={transcription.lead?.name}
        leadCompany={transcription.lead?.company}
        leadEmail={transcription.lead?.email}
        summary={summary ? {
          executive_summary: summary.executive_summary,
          key_points: summary.key_points,
          action_items: summary.action_items,
        } : null}
      />
    </CockpitLayout>
  );
}

// Error card component for error state
interface ErrorCardProps {
  transcription: {
    ai_metadata?: unknown;
  };
  onRetry: () => void;
  onRetryWithChunking: () => void;
  isProcessing: boolean;
  isChunkingRetry: boolean;
  chunkingProgress: TranscriptionProgress | null;
}

function ErrorCard({
  transcription,
  onRetry,
  onRetryWithChunking,
  isProcessing,
  isChunkingRetry,
  chunkingProgress,
}: ErrorCardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastError = String(((transcription.ai_metadata as any)?.last_error || '') as string);

  if (lastError.includes('too_large') || lastError.includes('file_too_large')) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-medium mb-2">Fichier trop volumineux</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Le fichier dépasse la limite autorisée (500 MB). Compressez-le ou découpez-le en segments plus courts.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (lastError.includes('ASSEMBLYAI_TIMEOUT') || lastError === 'timeout') {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-medium mb-2">Transcription trop longue</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Le traitement audio a dépassé le délai.
          </p>
          {chunkingProgress ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-muted-foreground">{chunkingProgress.message}</p>
              {chunkingProgress.currentChunk && chunkingProgress.totalChunks && (
                <div className="flex items-center gap-2 max-w-xs mx-auto">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(chunkingProgress.currentChunk / chunkingProgress.totalChunks) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {chunkingProgress.currentChunk}/{chunkingProgress.totalChunks}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-4">
              Essayez le <strong>mode découpage</strong> pour transcriber par segments.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={onRetryWithChunking} disabled={isChunkingRetry || isProcessing}>
              {isChunkingRetry ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4 mr-2" />
              )}
              Réessayer (découpage)
            </Button>
            <Button variant="outline" onClick={onRetry} disabled={isChunkingRetry || isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Réessayer (normal)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-medium mb-2">Erreur de traitement</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {lastError || 'Une erreur est survenue'}
        </p>
        <Button onClick={onRetry} disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}
