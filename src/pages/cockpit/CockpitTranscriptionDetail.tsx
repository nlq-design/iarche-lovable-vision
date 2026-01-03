import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Mail,
  Send,
  Copy,
  Check,
  UserPlus,
  X,
  Users,
  FolderPlus,
  PackagePlus,
  ListTodo,
  ArrowLeft,
  HardDrive,
  Clock,
  FileAudio,
  MessageSquareText,
  Scissors,
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transcribeLargeAudio, type TranscriptionProgress } from '@/lib/audioChunking';

// Simple transcript display (Whisper doesn't provide diarization)
function SimpleTranscript({ text }: { text: string }) {
  if (!text) {
    return <p className="text-sm text-muted-foreground">Aucune transcription disponible</p>;
  }
  return (
    <div className="prose prose-sm max-w-none">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export default function CockpitTranscriptionDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Dynamic file metadata (for legacy transcriptions without stored metadata)
  const [dynamicDuration, setDynamicDuration] = useState<number | null>(null);
  const [dynamicFileSize, setDynamicFileSize] = useState<number | null>(null);

  const { useTranscription, deleteTranscription, processTranscription, updateTranscription, transcriptions, isLoading: listLoading } = useCockpitVoiceTranscriptions();

  // Find transcription id from slug or id
  const transcriptionId = transcriptions.find(t => t.slug === slug || t.id === slug)?.id || slug || '';
  const { data: transcription, isLoading, refetch } = useTranscription(transcriptionId);

  const { leads } = useCockpitLeads();
  const { projects } = useCockpitProjects();
  const queryClient = useQueryClient();
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

  // Task creation state
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);

  // Entity selector states
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSolutionSelector, setShowSolutionSelector] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailType, setEmailType] = useState<'post_meeting' | 'followup'>('post_meeting');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{
    subject: string;
    greeting: string;
    body: string;
    cta: string;
    signature: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable title state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Editable date state
  const [editingDate, setEditingDate] = useState(false);

  // Analysis context state
  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState('');

  // Chunking retry state (for WHISPER_TIMEOUT recovery)
  const [isChunkingRetry, setIsChunkingRetry] = useState(false);
  const [chunkingProgress, setChunkingProgress] = useState<TranscriptionProgress | null>(null);

  // If a transcription is still queued, auto-start processing once when opening the detail page.
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

  // Fetch audio URL and dynamic metadata for legacy transcriptions
  useEffect(() => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
      setIsPlaying(false);
    }
    setAudioUrl(null);
    setDynamicDuration(null);
    setDynamicFileSize(null);

    if (!transcriptionId || !transcription?.storage_path) return;

    // Fetch signed URL
    supabase.storage
      .from('voice-transcriptions')
      .createSignedUrl(transcription.storage_path, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error('[Audio] Failed to get signed URL:', error);
          return;
        }
        if (data?.signedUrl) {
          setAudioUrl(data.signedUrl);
          
          // If no stored metadata, try to get it dynamically
          if (!transcription.duration_seconds || !transcription.file_size_bytes) {
            // Try to get file size via HEAD request
            fetch(data.signedUrl, { method: 'HEAD' })
              .then(res => {
                const contentLength = res.headers.get('content-length');
                if (contentLength && !transcription.file_size_bytes) {
                  setDynamicFileSize(parseInt(contentLength, 10));
                }
              })
              .catch(() => {});
            
            // Try to get duration by loading audio metadata
            if (!transcription.duration_seconds) {
              const tempAudio = new Audio();
              tempAudio.addEventListener('loadedmetadata', () => {
                if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                  setDynamicDuration(Math.round(tempAudio.duration));
                }
              });
              tempAudio.src = data.signedUrl;
              tempAudio.load();
            }
          }
        }
      });

    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [transcriptionId, transcription?.storage_path, transcription?.duration_seconds, transcription?.file_size_bytes]);

  const handlePlayPause = () => {
    if (!audioUrl) {
      toast.error('Fichier audio non disponible');
      return;
    }

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        toast.error('Erreur de lecture audio');
        setIsPlaying(false);
      };
      setAudioElement(audio);
      audio.play().catch(() => toast.error('Impossible de lire l\'audio'));
      setIsPlaying(true);
    } else if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play().catch(() => {
        setAudioElement(null);
        handlePlayPause();
      });
      setIsPlaying(true);
    }
  };

  const handleRetry = () => {
    // Always use the actual transcription.id (UUID), not the slug from URL
    const actualId = transcription?.id;
    if (actualId) {
      processTranscription.mutate({ jobId: actualId }, { onSuccess: () => refetch() });
    } else {
      toast.error('Transcription non trouvée');
    }
  };

  // Retry with client-side chunking (for WHISPER_TIMEOUT recovery)
  const handleRetryWithChunking = async () => {
    if (!transcription || !audioUrl) {
      toast.error('Audio non disponible');
      return;
    }

    setIsChunkingRetry(true);
    setChunkingProgress({ phase: 'loading', message: 'Téléchargement de l\'audio...' });

    try {
      // Fetch the audio file
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) throw new Error('Impossible de récupérer le fichier audio');
      const audioBlob = await audioRes.blob();

      // Transcribe with chunking
      const transcriptText = await transcribeLargeAudio(
        audioBlob,
        'fr',
        (progress) => setChunkingProgress(progress)
      );

      // Update the transcription with the new raw_transcript and reset status
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

      // Trigger LLM analysis (skip Whisper since we already have the transcript)
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

  const handleReanalyze = () => {
    const actualId = transcription?.id;
    if (actualId) {
      toast.info('Ré-analyse en cours...');
      processTranscription.mutate({ jobId: actualId, forceReanalyze: true }, {
        onSuccess: () => {
          refetch();
          toast.success('Synthèse et actions régénérées');
        },
      });
    } else {
      toast.error('Transcription non trouvée');
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

  const handleGenerateEmail = async () => {
    if (!transcription) return;
    setIsGeneratingEmail(true);
    setGeneratedEmail(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-followup-email', {
        body: {
          transcription_id: transcriptionId,
          lead_id: transcription.lead?.id || null,
          email_type: emailType,
          context: {
            transcript_summary: summary?.executive_summary || '',
            key_points: summary?.key_points || [],
            action_items: summary?.action_items || [],
            next_steps: summary?.next_steps || '',
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erreur de génération');

      setGeneratedEmail(data.email);
      toast.success('Email généré avec succès');
    } catch (err) {
      console.error('Email generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié dans le presse-papier');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenMailClient = () => {
    if (!generatedEmail) return;
    const recipientEmail = transcription?.lead?.email || '';
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(`${generatedEmail.greeting}\n\n${generatedEmail.body.replace(/<[^>]*>/g, '')}\n\n${generatedEmail.signature}`)}`;
    window.open(mailtoUrl, '_blank');
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
      // Save context first, then reanalyze
      const contextToSave = contextDraft.trim() || null;
      if (contextToSave !== transcription?.analysis_context) {
        updateTranscription.mutate({ id: transcriptionId, updates: { analysis_context: contextToSave } });
      }
      toast.info('Ré-analyse en cours avec le nouveau contexte...');
      processTranscription.mutate({ jobId: transcriptionId, forceReanalyze: true }, {
        onSuccess: () => {
          refetch();
          toast.success('Synthèse et actions régénérées');
        },
      });
      setEditingContext(false);
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  // Helper to format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}min ${secs}s`;
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
  const summary = transcription.summary;
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
          </div>
        </div>

        {/* Audio Player + File Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-4">
              <Button size="icon" variant="outline" onClick={handlePlayPause} disabled={!audioUrl}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">{transcription.original_filename || 'Audio original'}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  {transcription.source === 'upload' ? 'Fichier importé' : 'Enregistrement'}
                  {(transcription.file_size_bytes || dynamicFileSize) && (
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatFileSize(transcription.file_size_bytes || dynamicFileSize)}
                    </span>
                  )}
                  {(transcription.duration_seconds || dynamicDuration) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(transcription.duration_seconds || dynamicDuration)}
                    </span>
                  )}
                  {transcription.audio_format ? (
                    <span className="flex items-center gap-1">
                      <FileAudio className="h-3 w-3" />
                      {transcription.audio_format.toUpperCase()}
                    </span>
                  ) : transcription.original_filename ? (
                    <span className="flex items-center gap-1">
                      <FileAudio className="h-3 w-3" />
                      {(transcription.original_filename.split('.').pop() || '').toUpperCase()}
                    </span>
                  ) : null}
                </div>
              </div>
              {transcription.status === 'error' && (
                <Button size="sm" variant="outline" onClick={handleRetry} disabled={processTranscription.isPending}>
                  {processTranscription.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Réessayer
                </Button>
              )}
              {/* Stuck detection: analyzing for >3 minutes indicates platform timeout */}
              {(transcription.status === 'analyzing' || transcription.status === 'transcribing') && transcription.created_at && (() => {
                const createdAt = new Date(transcription.created_at);
                const now = new Date();
                const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
                const isStuck = diffMinutes > 3;
                return isStuck ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Bloqué
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleRetry}
                      disabled={processTranscription.isPending}
                    >
                      {processTranscription.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Relancer
                    </Button>
                  </div>
                ) : null;
              })()}
              {transcription.status === 'done' && (
                <Button size="sm" variant="outline" onClick={handleReanalyze} disabled={processTranscription.isPending}>
                  {processTranscription.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Ré-analyser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
                  placeholder="Ajoutez du contexte pour améliorer l'analyse IA (ex: c'est un RDV de découverte avec un prospect du secteur santé, nous avons déjà échangé par email...)"
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
        <div className="flex flex-wrap gap-2">
          {/* Lead Link */}
          {transcription.lead ? (
            <Badge variant="secondary" className="cursor-pointer group" onClick={() => navigate(`/cockpit/leads/${transcription.lead!.id}`)}>
              <User className="h-3 w-3 mr-1" />
              {transcription.lead.name}
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTranscription.mutate({ id: transcriptionId, updates: { lead_id: null } });
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : showLeadSelector ? (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(leadId) => {
                  updateTranscription.mutate({ id: transcriptionId, updates: { lead_id: leadId } }, { onSuccess: () => setShowLeadSelector(false) });
                }}
              >
                <SelectTrigger className="h-7 w-48 text-xs">
                  <SelectValue placeholder="Sélectionner un lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.company && `(${lead.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowLeadSelector(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setShowLeadSelector(true)}>
              <UserPlus className="h-3 w-3 mr-1" />
              Lier à un lead
            </Badge>
          )}

          {/* Contact Link */}
          {transcription.lead && (
            transcription.lead_contact ? (
              <Badge variant="outline" className="group">
                <Users className="h-3 w-3 mr-1" />
                {transcription.lead_contact.name}
                {transcription.lead_contact.position && <span className="text-muted-foreground ml-1">({transcription.lead_contact.position})</span>}
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => updateTranscription.mutate({ id: transcriptionId, updates: { lead_contact_id: null } })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : showContactSelector ? (
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(contactId) => {
                    updateTranscription.mutate({ id: transcriptionId, updates: { lead_contact_id: contactId } }, { onSuccess: () => setShowContactSelector(false) });
                  }}
                >
                  <SelectTrigger className="h-7 w-48 text-xs">
                    <SelectValue placeholder="Sélectionner un contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leadContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.position && `(${contact.position})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowContactSelector(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : leadContacts.length > 0 ? (
              <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setShowContactSelector(true)}>
                <Users className="h-3 w-3 mr-1" />
                Lier à un contact
              </Badge>
            ) : null
          )}

          {/* Project Link */}
          {transcription.project ? (
            <Badge variant="secondary" className="cursor-pointer group" onClick={() => navigate(`/cockpit/projects/${transcription.project!.id}`)}>
              <FolderOpen className="h-3 w-3 mr-1" />
              {transcription.project.name}
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTranscription.mutate({ id: transcriptionId, updates: { project_id: null } });
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : showProjectSelector ? (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(projectId) => {
                  updateTranscription.mutate({ id: transcriptionId, updates: { project_id: projectId } }, { onSuccess: () => setShowProjectSelector(false) });
                }}
              >
                <SelectTrigger className="h-7 w-48 text-xs">
                  <SelectValue placeholder="Sélectionner un projet..." />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowProjectSelector(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setShowProjectSelector(true)}>
              <FolderPlus className="h-3 w-3 mr-1" />
              Lier à un projet
            </Badge>
          )}

          {/* Solution Link */}
          {transcription.solution ? (
            <Badge variant="secondary" className="cursor-pointer group" onClick={() => navigate(`/cockpit/solutions/${transcription.solution!.id}`)}>
              <Package className="h-3 w-3 mr-1" />
              {transcription.solution.title}
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTranscription.mutate({ id: transcriptionId, updates: { solution_id: null } });
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : showSolutionSelector ? (
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(solutionId) => {
                  updateTranscription.mutate({ id: transcriptionId, updates: { solution_id: solutionId } }, { onSuccess: () => setShowSolutionSelector(false) });
                }}
              >
                <SelectTrigger className="h-7 w-48 text-xs">
                  <SelectValue placeholder="Sélectionner une solution..." />
                </SelectTrigger>
                <SelectContent>
                  {solutions.map((solution) => (
                    <SelectItem key={solution.id} value={solution.id}>
                      {solution.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSolutionSelector(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setShowSolutionSelector(true)}>
              <PackagePlus className="h-3 w-3 mr-1" />
              Lier à une solution
            </Badge>
          )}

          {/* Meeting Note Link (read only) */}
          {transcription.meeting_note && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => navigate('/cockpit/agenda')}>
              <FileText className="h-3 w-3 mr-1" />
              {transcription.meeting_note.objectives ? transcription.meeting_note.objectives.substring(0, 30) + '...' : 'Compte-rendu'}
            </Badge>
          )}
        </div>

        {/* Partners Section */}
        {transcriptionId && <LinkedPartnersSection entityType="transcription" entityId={transcriptionId} compact />}

        {/* Content Tabs */}
        {transcription.status === 'done' && summary ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Synthèse</TabsTrigger>
              <TabsTrigger value="transcript">Transcription</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="consulte" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Consulte
              </TabsTrigger>
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
                  <p className="text-sm">{typeof summary.executive_summary === 'string' ? summary.executive_summary : JSON.stringify(summary.executive_summary)}</p>
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
                          {typeof point === 'string' ? point : JSON.stringify(point)}
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
                          {typeof decision === 'string' ? decision : JSON.stringify(decision)}
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
                        <li key={i} className="text-sm">{typeof risk === 'string' ? risk : JSON.stringify(risk)}</li>
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
                        <li key={i} className="text-sm">{typeof q === 'string' ? q : JSON.stringify(q)}</li>
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
                    <p className="text-sm">{typeof summary.next_steps === 'string' ? summary.next_steps : JSON.stringify(summary.next_steps)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Quality indicator */}
              {summary.extraction_quality && (
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                  <span>Confiance IA: {summary.extraction_quality.confidence}%</span>
                  {summary.extraction_quality.uncertainties?.length > 0 && <span>{summary.extraction_quality.uncertainties.length} incertitude(s)</span>}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="pt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Transcription complète
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <SimpleTranscript text={transcription.raw_transcript || ''} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 pt-4">
              {summary.action_items?.length > 0 ? (
                <>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const safeStr = (v: unknown): string => {
                          if (v == null) return '';
                          if (typeof v === 'string') return v;
                          if (typeof v === 'number') return String(v);
                          return JSON.stringify(v);
                        };

                        const parseDueDate = (raw: string): string | null => {
                          if (!raw) return null;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
                          const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
                          if (isoMatch) return isoMatch[1];
                          const frMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                          if (frMatch) {
                            const [, d, m, y] = frMatch;
                            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                          }
                          return null;
                        };

                        summary.action_items?.forEach((action) => {
                          const actionObj = action as Record<string, unknown>;
                          const taskText = typeof action === 'string' ? action : safeStr(actionObj.task || actionObj.step || '');
                          const priorityRaw = safeStr(actionObj.priority) || 'medium';
                          const dueDateParsed = parseDueDate(safeStr(actionObj.due_date || actionObj.due));

                          if (taskText) {
                            createTask.mutate({
                              title: taskText.slice(0, 200),
                              task_type: 'follow_up',
                              priority: (['low', 'medium', 'high'].includes(priorityRaw) ? priorityRaw : 'medium') as 'low' | 'medium' | 'high',
                              lead_id: transcription.lead_id || null,
                              project_id: transcription.project_id || null,
                              due_date: dueDateParsed,
                              ai_generated: true,
                              ai_metadata: { source: 'transcription', transcription_id: transcriptionId },
                            });
                          }
                        });
                        toast.success(`${summary.action_items?.length || 0} tâches créées`);
                      }}
                    >
                      <ListTodo className="h-4 w-4 mr-2" />
                      Créer toutes les tâches
                    </Button>
                  </div>

                  {summary.action_items.map((action, i) => {
                    const safeStr = (v: unknown): string => {
                      if (v == null) return '';
                      if (typeof v === 'string') return v;
                      if (typeof v === 'number') return String(v);
                      if (v instanceof Date) return v.toISOString();
                      if (typeof v === 'object') return JSON.stringify(v);
                      return String(v);
                    };

                    const parseDueDate = (raw: string): string | null => {
                      if (!raw) return null;
                      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
                      const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
                      if (isoMatch) return isoMatch[1];
                      const frMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                      if (frMatch) {
                        const [, d, m, y] = frMatch;
                        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                      return null;
                    };

                    const actionObj = action as Record<string, unknown>;
                    const taskText = typeof action === 'string' ? action : safeStr(actionObj.task || actionObj.step || '');
                    const ownerText = typeof action === 'object' ? safeStr(actionObj.owner) : '';
                    const dueText = typeof action === 'object' ? safeStr(actionObj.due_date || actionObj.due) : '';
                    const dueDateParsed = parseDueDate(dueText);
                    const priorityRaw = typeof action === 'object' ? safeStr(actionObj.priority) : 'medium';
                    const priorityText = priorityRaw || 'medium';
                    const categoryRaw = typeof action === 'object' ? safeStr(actionObj.category) : '';

                    if (!taskText) return null;

                    return (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{taskText}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {ownerText && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ownerText}</span>}
                                {dueText && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dueText}</span>}
                                {categoryRaw && <Badge variant="outline" className="text-xs h-5">{categoryRaw}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={priorityText === 'high' ? 'destructive' : priorityText === 'medium' ? 'default' : 'secondary'}>
                                {priorityText}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={creatingTaskIndex === i}
                                onClick={() => {
                                  setCreatingTaskIndex(i);
                                  createTask.mutate({
                                    title: taskText.slice(0, 200),
                                    task_type: 'follow_up',
                                    priority: (['low', 'medium', 'high'].includes(priorityText) ? priorityText : 'medium') as 'low' | 'medium' | 'high',
                                    lead_id: transcription.lead_id || null,
                                    project_id: transcription.project_id || null,
                                    due_date: dueDateParsed,
                                    ai_generated: true,
                                    ai_metadata: { source: 'transcription', transcription_id: transcriptionId },
                                  }, { onSettled: () => setCreatingTaskIndex(null) });
                                }}
                                title="Créer une tâche"
                              >
                                {creatingTaskIndex === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTodo className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune action identifiée</p>
                </div>
              )}
            </TabsContent>

            {/* Consulte Tab */}
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
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-medium mb-2">Erreur de traitement</h3>
              {(() => {
                const lastError = String(((transcription.ai_metadata as any)?.last_error || '') as string);

                if (lastError.includes('WHISPER_MAX_SIZE')) {
                  return (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Fichier trop volumineux</strong> — La limite Whisper est de 25 MB.
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Compressez le fichier ou découpez-le en segments plus courts avant de réuploader.
                      </p>
                    </>
                  );
                }

                if (lastError.includes('WHISPER_TIMEOUT') || lastError === 'timeout') {
                  return (
                    <>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Transcription trop longue</strong> — le traitement audio a dépassé le délai.
                      </p>
                      {chunkingProgress ? (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs text-muted-foreground">{chunkingProgress.message}</p>
                          {chunkingProgress.currentChunk && chunkingProgress.totalChunks && (
                            <div className="flex items-center gap-2">
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
                          Le traitement en un seul bloc a échoué. Essayez le <strong>mode découpage</strong> pour transcriber par segments.
                        </p>
                      )}
                      <div className="flex gap-2 justify-center">
                        <Button 
                          onClick={handleRetryWithChunking} 
                          disabled={isChunkingRetry || processTranscription.isPending}
                          variant="default"
                        >
                          {isChunkingRetry ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Scissors className="h-4 w-4 mr-2" />
                          )}
                          Réessayer (découpage)
                        </Button>
                        <Button 
                          onClick={handleRetry} 
                          disabled={isChunkingRetry || processTranscription.isPending}
                          variant="outline"
                        >
                          {processTranscription.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Réessayer (normal)
                        </Button>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      {lastError || 'Une erreur est survenue'}
                    </p>
                    <Button onClick={handleRetry} disabled={processTranscription.isPending}>
                      {processTranscription.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Réessayer
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="font-medium mb-2">Traitement en cours</h3>
              <p className="text-sm text-muted-foreground">
                {transcription.status === 'transcribing' ? 'Transcription audio...' : 'Analyse IA en cours...'}
              </p>
            </CardContent>
          </Card>
        )}
        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {transcription.status === 'done' && (
            <Button variant="outline" size="sm" className="bg-primary/5 border-primary/20 hover:bg-primary/10" onClick={() => setShowEmailDialog(true)}>
              <Mail className="h-4 w-4 mr-2 text-primary" />
              Rédiger mail de suivi
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

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

      {/* Email Generation Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Rédiger un email de suivi
            </DialogTitle>
            <DialogDescription>
              {transcription.lead
                ? `Email de suivi pour ${transcription.lead.name}${transcription.lead.company ? ` (${transcription.lead.company})` : ''}`
                : 'Générez un email de suivi basé sur la transcription'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type d'email</Label>
              <Select value={emailType} onValueChange={(v: any) => setEmailType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_meeting">Post-RDV - Suivi après la réunion</SelectItem>
                  <SelectItem value="followup">Relance - Suite aux discussions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!generatedEmail && (
              <Button onClick={handleGenerateEmail} disabled={isGeneratingEmail} className="w-full">
                {isGeneratingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer l'email
                  </>
                )}
              </Button>
            )}

            {generatedEmail && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Objet</Label>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleCopyToClipboard(generatedEmail.subject, 'subject')}>
                      {copiedField === 'subject' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="font-medium text-sm">{generatedEmail.subject}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Corps de l'email</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() =>
                        handleCopyToClipboard(
                          `${generatedEmail.greeting}\n\n${generatedEmail.body.replace(/<[^>]*>/g, '')}\n\n${generatedEmail.signature}`,
                          'body'
                        )
                      }
                    >
                      {copiedField === 'body' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="bg-background rounded p-3 text-sm space-y-3">
                    <p>{generatedEmail.greeting}</p>
                    <div dangerouslySetInnerHTML={{ __html: generatedEmail.body }} />
                    <p className="text-muted-foreground whitespace-pre-line">{generatedEmail.signature}</p>
                  </div>
                </div>

                {generatedEmail.cta && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">CTA suggéré :</span>
                    <Badge variant="secondary">{generatedEmail.cta}</Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {generatedEmail && (
              <>
                <Button variant="outline" onClick={() => setGeneratedEmail(null)}>
                  Régénérer
                </Button>
                <Button onClick={handleOpenMailClient}>
                  <Send className="h-4 w-4 mr-2" />
                  Ouvrir dans email
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CockpitLayout>
  );
}
