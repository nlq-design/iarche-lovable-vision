import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeadContacts } from '@/hooks/cockpit/useCockpitLeadContacts';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useTranscriptionParticipants } from '@/hooks/cockpit/useTranscriptionParticipants';
import { toast } from 'sonner';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';
import { useQuery } from '@tanstack/react-query';
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
  TranscriptionAudioPlayer,
  normalizeSummary,
  TranscriptionEntityLinks,
  TranscriptionEmailDialog,
  TranscriptionParticipantsSection,
} from '@/components/cockpit/transcriptions/shared';
import {
  TranscriptionDetailHeader,
  TranscriptionContextEditor,
  TranscriptionContentTabs,
} from '@/components/cockpit/transcriptions/detail';

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
  const [dynamicDuration, setDynamicDuration] = useState<number | null>(null);
  const [dynamicFileSize, setDynamicFileSize] = useState<number | null>(null);

  const { useTranscription, deleteTranscription, processTranscription, updateTranscription, transcriptions, isLoading: listLoading } = useCockpitVoiceTranscriptions();

  const resolvedId = transcriptions.find(t => t.slug === slug || t.id === slug)?.id;
  const transcriptionId = resolvedId || '';
  const { data: transcription, isLoading, refetch } = useTranscription(transcriptionId);

  const { leads } = useCockpitLeads();
  const { projects } = useCockpitProjects();
  const { createTask } = useCockpitTasks();
  const { contacts: leadContacts = [] } = useCockpitLeadContacts(transcription?.lead_id || undefined);
  const { participants: persistedParticipants } = useTranscriptionParticipants(transcriptionId || null);

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

  // === Audio URL & dynamic metadata ===
  useEffect(() => {
    setAudioUrl(null);
    setDynamicDuration(null);
    setDynamicFileSize(null);

    if (!transcriptionId || !transcription?.storage_path) return;
    if (transcription.storage_path.endsWith('_no_file')) return;

    const fetchSignedUrl = async () => {
      const { data: primaryData, error: primaryError } = await supabase.storage
        .from('voice-transcriptions')
        .createSignedUrl(transcription.storage_path, 3600);
      if (!primaryError && primaryData?.signedUrl) return primaryData.signedUrl;

      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('cockpit-uploads')
        .createSignedUrl(transcription.storage_path, 3600);
      if (!fallbackError && fallbackData?.signedUrl) return fallbackData.signedUrl;

      console.error('[Audio] Failed to get signed URL:', primaryError, fallbackError);
      return null;
    };

    fetchSignedUrl().then((signedUrl) => {
      if (!signedUrl) return;
      setAudioUrl(signedUrl);

      if (!transcription.duration_seconds || !transcription.file_size_bytes) {
        fetch(signedUrl, { method: 'HEAD' })
          .then(res => {
            const contentLength = res.headers.get('content-length');
            if (contentLength && !transcription.file_size_bytes) setDynamicFileSize(parseInt(contentLength, 10));
          })
          .catch(() => {});

        if (!transcription.duration_seconds) {
          const tempAudio = new Audio();
          tempAudio.addEventListener('loadedmetadata', () => {
            if (isFinite(tempAudio.duration) && tempAudio.duration > 0) setDynamicDuration(Math.round(tempAudio.duration));
          });
          tempAudio.src = signedUrl;
          tempAudio.load();
        }
      }
    });
  }, [transcriptionId, transcription?.storage_path, transcription?.duration_seconds, transcription?.file_size_bytes]);

  // === Handlers ===
  const handleRetry = () => {
    if (transcription?.id) {
      processTranscription.mutate({ jobId: transcription.id }, { onSuccess: () => refetch() });
    }
  };

  const handleReanalyze = () => {
    if (transcription?.id) {
      toast.info('Ré-analyse mise en file d\'attente...');
      processTranscription.mutate({ jobId: transcription.id, forceReanalyze: true }, {
        onSuccess: () => { refetch(); toast.success('Ré-analyse planifiée'); },
      });
    }
  };

  const handleDelete = () => {
    if (transcriptionId) {
      deleteTranscription.mutate(transcriptionId, {
        onSuccess: () => { setShowDeleteDialog(false); navigate('/cockpit/transcriptions'); },
      });
    }
  };

  const handleUpdateTranscription = (updates: Record<string, string | null>) => {
    if (transcriptionId) updateTranscription.mutate({ id: transcriptionId, updates });
  };

  // === Redirects ===
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

  if (!transcription) return null;

  const statusConfig = TRANSCRIPTION_STATUSES.find(s => s.value === transcription.status);
  const summary = normalizeSummary(transcription.summary);
  const displayTitle = transcription.title || (summary?.title ? (typeof summary.title === 'string' ? summary.title : JSON.stringify(summary.title)) : 'Transcription');

  return (
    <CockpitLayout>
      <div className="p-5 space-y-5">
        {/* Header */}
        <TranscriptionDetailHeader
          displayTitle={displayTitle}
          transcriptionDate={transcription.transcription_date}
          createdAt={transcription.created_at}
          statusConfig={statusConfig as any}
          onSaveTitle={(title) => updateTranscription.mutate({ id: transcriptionId, updates: { title } })}
          onSaveDate={(date) => updateTranscription.mutate({ id: transcriptionId, updates: { transcription_date: format(date, 'yyyy-MM-dd') } })}
          onEmailClick={() => setShowEmailDialog(true)}
          onDeleteClick={() => setShowDeleteDialog(true)}
        />

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

        {/* Context Editor */}
        <TranscriptionContextEditor
          analysisContext={transcription.analysis_context}
          isProcessing={processTranscription.isPending}
          onSave={(ctx) => updateTranscription.mutate({ id: transcriptionId, updates: { analysis_context: ctx } })}
          onSaveAndReanalyze={(ctx) => {
            if (ctx !== transcription.analysis_context) {
              updateTranscription.mutate({ id: transcriptionId, updates: { analysis_context: ctx } });
            }
            toast.info('Ré-analyse en cours avec le nouveau contexte...');
            processTranscription.mutate({ jobId: transcriptionId, forceRetranscribe: true }, {
              onSuccess: () => { refetch(); toast.success('Synthèse et actions régénérées'); },
            });
          }}
        />

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
        <LinkedPartnersSection entityType="transcription" entityId={transcriptionId} />

        {/* Content Tabs */}
        <TranscriptionContentTabs
          transcriptionId={transcriptionId}
          status={transcription.status}
          summary={summary}
          rawTranscript={transcription.raw_transcript}
          segments={parseEnrichedSegments(transcription.segments)}
          languageDetected={(transcription.ai_metadata as any)?.language_detected}
          leadId={transcription.lead_id}
          projectId={transcription.project_id}
          displayTitle={displayTitle}
          aiDocumentsSummary={transcription.ai_documents_summary || null}
          persistedParticipants={persistedParticipants}
          isProcessing={processTranscription.isPending}
          onRetry={handleRetry}
          onReanalyze={handleReanalyze}
          onRefetch={() => refetch()}
          onCreateTask={(task) => createTask.mutate(task)}
          onSeekAudio={(timeMs) => {
            const audioEl = document.querySelector('audio');
            if (audioEl) { audioEl.currentTime = timeMs / 1000; audioEl.play(); }
          }}
          aiMetadata={transcription.ai_metadata}
        />
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
