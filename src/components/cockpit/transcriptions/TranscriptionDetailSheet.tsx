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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Calendar,
  AlertTriangle,
  Loader2,
  FileText,
  Mail,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeadContacts } from '@/hooks/cockpit/useCockpitLeadContacts';
import { useCockpitTasks } from '@/hooks/cockpit/useCockpitTasks';
import { useTranscriptionParticipants } from '@/hooks/cockpit/useTranscriptionParticipants';
import { useNavigate } from 'react-router-dom';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';
import { OwnerBadge } from '@/components/cockpit/shared/OwnerBadge';
import { useQuery } from '@tanstack/react-query';
import {
  TranscriptionSummaryTab,
  TranscriptionActionsTab,
  TranscriptionAudioPlayer,
  SimpleTranscript,
  TranscriptionEntityLinks,
  TranscriptionEmailDialog,
  TranscriptionParticipantsSection,
  normalizeSummary,
} from './shared';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const { useTranscription, deleteTranscription, processTranscription, updateTranscription } = useCockpitVoiceTranscriptions();
  const { data: transcription, isLoading, refetch } = useTranscription(transcriptionId || '');
  const { leads } = useCockpitLeads();
  const { projects } = useCockpitProjects();
  const { createTask } = useCockpitTasks();
  
  // Fetch contacts for the linked lead
  const { contacts: leadContacts = [] } = useCockpitLeadContacts(transcription?.lead_id || undefined);
  const { participants: persistedParticipants } = useTranscriptionParticipants(transcriptionId);
  
  // Fetch solutions (articles with resource_type = 'solution')
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
  const [editingDate, setEditingDate] = useState(false);

  // Sync title draft when transcription loads
  useEffect(() => {
    if (transcription) {
      const displayTitle = transcription.title || (transcription.summary?.title as string) || '';
      setTitleDraft(typeof displayTitle === 'string' ? displayTitle : JSON.stringify(displayTitle));
    }
  }, [transcription]);

  // Fetch audio URL
  useEffect(() => {
    setAudioUrl(null);

    if (!transcriptionId || !transcription?.storage_path) return;

    supabase.storage
      .from('voice-transcriptions')
      .createSignedUrl(transcription.storage_path, 3600)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      });
  }, [transcriptionId, transcription?.storage_path]);

  const handleRetry = () => {
    if (transcriptionId) {
      processTranscription.mutate({ jobId: transcriptionId }, { onSuccess: () => refetch() });
    }
  };

  const handleReanalyze = () => {
    if (transcriptionId) {
      processTranscription.mutate({ jobId: transcriptionId, forceReanalyze: true }, { onSuccess: () => refetch() });
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

  const handleEntityUpdate = (updates: Record<string, string | null>) => {
    if (transcriptionId) {
      updateTranscription.mutate({ id: transcriptionId, updates });
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
        updates: { transcription_date: format(date, 'yyyy-MM-dd') } 
      });
      setEditingDate(false);
    }
  };

  if (!transcriptionId) return null;

  const statusConfig = TRANSCRIPTION_STATUSES.find(s => s.value === transcription?.status);
  const summary = transcription?.summary;
  const normalizedSummary = normalizeSummary(summary);
  const displayTitle = transcription?.title || (summary?.title ? (typeof summary.title === 'string' ? summary.title : JSON.stringify(summary.title)) : 'Transcription');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
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
                  <SheetTitle 
                    className="text-lg cursor-pointer hover:text-primary transition-colors truncate"
                    onClick={() => setEditingTitle(true)}
                    title="Cliquer pour modifier"
                  >
                    {isLoading ? 'Chargement...' : displayTitle}
                  </SheetTitle>
                )}
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {editingDate ? (
                    <Popover open={editingDate} onOpenChange={setEditingDate}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {transcription?.transcription_date 
                            ? format(new Date(transcription.transcription_date), 'dd MMM yyyy', { locale: fr })
                            : 'Sélectionner une date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={transcription?.transcription_date ? new Date(transcription.transcription_date) : undefined}
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
                      {transcription?.transcription_date 
                        ? format(new Date(transcription.transcription_date), 'dd MMMM yyyy', { locale: fr })
                        : transcription?.created_at && 
                          format(new Date(transcription.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  )}
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
                {/* Created by */}
                {transcription?.created_by && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0">Créé par</span>
                    <OwnerBadge userId={transcription.created_by} size="md" />
                  </div>
                )}

                {/* Audio Player */}
                <TranscriptionAudioPlayer
                  audioUrl={audioUrl}
                  originalFilename={transcription?.original_filename}
                  source={transcription?.source}
                  status={transcription?.status || 'queued'}
                  isProcessing={processTranscription.isPending}
                  onRetry={handleRetry}
                  onReanalyze={handleReanalyze}
                />

                {/* Entity Links */}
                <TranscriptionEntityLinks
                  transcriptionId={transcriptionId}
                  lead={transcription?.lead}
                  leadContact={transcription?.lead_contact}
                  project={transcription?.project}
                  solution={transcription?.solution}
                  meetingNote={transcription?.meeting_note}
                  leads={leads}
                  projects={projects ?? []}
                  solutions={solutions}
                  leadContacts={leadContacts}
                  onUpdate={handleEntityUpdate}
                  onNavigate={navigate}
                  onClose={() => onOpenChange(false)}
                />

                {/* Participants */}
                <TranscriptionParticipantsSection
                  transcriptionId={transcriptionId}
                  normalizedSummary={normalizedSummary}
                  compact
                />

                {/* Partners Section */}
                {transcriptionId && (
                  <LinkedPartnersSection 
                    entityType="transcription" 
                    entityId={transcriptionId} 
                    compact 
                  />
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
                      <TranscriptionSummaryTab summary={normalizedSummary} persistedParticipants={persistedParticipants} />
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
                      <TranscriptionActionsTab
                        actionItems={normalizedSummary.action_items}
                        transcriptionId={transcriptionId}
                        leadId={transcription?.lead_id}
                        projectId={transcription?.project_id}
                        onCreateTask={(task) => createTask.mutate(task)}
                      />
                    </TabsContent>
                  </Tabs>
                ) : transcription?.status === 'error' ? (
                  <Card className="border-destructive">
                    <CardContent className="p-6 text-center">
                      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Erreur de traitement</h3>
                      {((transcription.ai_metadata as any)?.last_error || '').includes('file_too_large') || ((transcription.ai_metadata as any)?.last_error || '').includes('too_large') ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Fichier trop volumineux</strong> — La limite est de 500 MB.
                          </p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Compressez le fichier ou découpez-le en segments plus courts avant de réuploader.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">
                            {(transcription.ai_metadata as any)?.last_error || 'Une erreur est survenue'}
                          </p>
                          <Button onClick={handleRetry}>
                            Réessayer
                          </Button>
                        </>
                      )}
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
          <div className="px-6 py-4 border-t bg-background space-y-2">
            {transcription?.status === 'done' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-primary/5 border-primary/20 hover:bg-primary/10"
                onClick={() => setShowEmailDialog(true)}
              >
                <Mail className="h-4 w-4 mr-2 text-primary" />
                Rédiger mail de suivi
              </Button>
            )}
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

      {/* Email Generation Dialog */}
      <TranscriptionEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        transcriptionId={transcriptionId}
        leadId={transcription?.lead?.id}
        leadName={transcription?.lead?.name}
        leadCompany={transcription?.lead?.company}
        leadEmail={transcription?.lead?.email}
        summary={summary}
      />
    </>
  );
}
