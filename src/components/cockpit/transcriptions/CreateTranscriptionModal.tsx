import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Mic, MicOff, Loader2, Check, CalendarIcon, Sparkles, Zap, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, useAIPromptProfiles, type ExpectedParticipant } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads, useCockpitProjects, useCockpitMeetingNotes } from '@/hooks/cockpit';
import { useOwnerProfile } from '@/hooks/cockpit/useOwnerProfile';
import { ParticipantPicker } from './ParticipantPicker';
import { TranscriptionEntityLinker, type EntitySelection } from './TranscriptionEntityLinker';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
// Audio chunking no longer needed client-side — transcription-worker handles it server-side

interface CreateTranscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultLeadId?: string;
  defaultProjectId?: string;
  defaultSolutionId?: string;
  defaultMeetingNoteId?: string;
  defaultFiles?: File[];
}

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB — server handles large files via signed URL

export function CreateTranscriptionModal({
  open,
  onOpenChange,
  onSuccess,
  defaultLeadId,
  defaultProjectId,
  defaultSolutionId,
  defaultMeetingNoteId,
  defaultFiles,
}: CreateTranscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  // Chunking progress removed — server-side processing
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Set files from drag & drop
  useEffect(() => {
    if (defaultFiles && defaultFiles.length > 0 && open) {
      setSelectedFiles(defaultFiles);
      setActiveTab('upload');
    }
  }, [defaultFiles, open]);

  // Multi-entity selection (replaces old single entityType/selectedEntityId)
  const [entitySelection, setEntitySelection] = useState<EntitySelection>({
    leadId: defaultLeadId || null,
    leadContactId: null,
    projectId: defaultProjectId || null,
    solutionId: defaultSolutionId || null,
    meetingNoteId: defaultMeetingNoteId || null,
  });
  const [promptProfileId, setPromptProfileId] = useState<string>('');
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [transcriptionDate, setTranscriptionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [analysisContext, setAnalysisContext] = useState<string>('');
  const [expectedParticipants, setExpectedParticipants] = useState<ExpectedParticipant[]>([]);
  const [qualityMode, setQualityMode] = useState<'standard' | 'high'>('standard');
  const [suggestedContacts, setSuggestedContacts] = useState<ExpectedParticipant[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createTranscription, processTranscription } = useCockpitVoiceTranscriptions();
  const { data: promptProfiles = [] } = useAIPromptProfiles('transcription');
  const { leads = [] } = useCockpitLeads();
  const { projects = [] } = useCockpitProjects();
  const meetingNotesResult = useCockpitMeetingNotes();
  const meetingNotes = meetingNotesResult?.meetingNotes ?? [];
  const { ownerProfile } = useOwnerProfile();

  // Auto-add owner as expected participant when modal opens
  useEffect(() => {
    if (open && ownerProfile && expectedParticipants.length === 0) {
      setExpectedParticipants([{
        name: ownerProfile.display_name,
        type: 'owner',
        entity_id: ownerProfile.id,
        company: ownerProfile.role_label ?? 'Propriétaire',
      }]);
    }
  }, [open, ownerProfile]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const { data: solutions = [] } = useQuery({
    queryKey: ['solutions-for-transcription'],
    queryFn: async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title')
        .eq('resource_type', 'solution')
        .eq('published', true)
        .order('title');
      return data ?? [];
    },
  });

  const { data: leadContacts = [] } = useQuery({
    queryKey: ['lead-contacts-for-transcription'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_contacts')
        .select('id, name, email, position')
        .order('name')
        .limit(200);
      return data ?? [];
    },
  });

  const resetForm = useCallback(() => {
    setSelectedFiles([]);
    setRecordedBlob(null);
    setEntitySelection({ leadId: null, leadContactId: null, projectId: null, solutionId: null, meetingNoteId: null });
    setPromptProfileId('');
    setAutoCreateTasks(true);
    setTranscriptionDate(format(new Date(), 'yyyy-MM-dd'));
    setAnalysisContext('');
    setExpectedParticipants([]);
    setSuggestedContacts([]);
    setQualityMode('standard');
    setUploadProgress({ current: 0, total: 0 });
  }, []);

  // === BRIDGE: Auto-inject Lead Contact → participants & auto-suggest Lead's contacts ===
  useEffect(() => {
    // Auto-inject selected Lead Contact as expected participant
    if (entitySelection.leadContactId) {
      const contact = leadContacts.find(c => c.id === entitySelection.leadContactId);
      if (contact && !expectedParticipants.some(p => p.entity_id === contact.id && p.type === 'lead_contact')) {
        setExpectedParticipants(prev => [
          ...prev,
          { name: contact.name, type: 'lead_contact', entity_id: contact.id, company: contact.position ?? undefined },
        ]);
      }
    }
  }, [entitySelection.leadContactId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-suggest Lead's contacts when a Lead is selected
    if (entitySelection.leadId) {
      const fetchLeadContacts = async () => {
        const { data } = await supabase
          .from('lead_contacts')
          .select('id, name, email, position')
          .eq('lead_id', entitySelection.leadId!)
          .order('name')
          .limit(10);
        if (data && data.length > 0) {
          const suggestions: ExpectedParticipant[] = data
            .filter(c => !expectedParticipants.some(p => p.entity_id === c.id))
            .map(c => ({
              name: c.name,
              type: 'lead_contact' as const,
              entity_id: c.id,
              company: c.position ?? c.email ?? undefined,
            }));
          setSuggestedContacts(suggestions);
        } else {
          setSuggestedContacts([]);
        }
      };
      fetchLeadContacts();
    } else {
      setSuggestedContacts([]);
    }
  }, [entitySelection.leadId]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
      setRecordedBlob(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Helper to get audio duration from a blob/file
  const getAudioMetadata = async (blob: Blob | File): Promise<{ duration: number | null; format: string | null }> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        const url = URL.createObjectURL(blob);
        
        audio.addEventListener('loadedmetadata', () => {
          const duration = isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null;
          const format = blob.type?.split('/')[1] || (blob instanceof File ? blob.name.split('.').pop() : null);
          URL.revokeObjectURL(url);
          resolve({ duration, format: format || null });
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          // Still try to get format from file extension
          const format = blob instanceof File ? blob.name.split('.').pop() : null;
          resolve({ duration: null, format: format || null });
        });
        
        audio.src = url;
        audio.load();
        
        // Timeout after 5s
        setTimeout(() => {
          URL.revokeObjectURL(url);
          const format = blob instanceof File ? blob.name.split('.').pop() : null;
          resolve({ duration: null, format: format || null });
        }, 5000);
      } catch {
        const format = blob instanceof File ? blob.name.split('.').pop() : null;
        resolve({ duration: null, format: format || null });
      }
    });
  };

  const handleSubmit = async () => {
    const filesToUpload = activeTab === 'upload' ? selectedFiles : (recordedBlob ? [recordedBlob] : []);


    if (filesToUpload.length === 0) {
      toast.error('Veuillez sélectionner ou enregistrer un audio');
      return;
    }

    // Check for files that are too large
    const tooLarge = filesToUpload.find((f) => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      const name = tooLarge instanceof File ? tooLarge.name : 'audio';
      toast.error(`Fichier trop volumineux (max ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB) : ${name}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Non authentifié');

      const userId = userData.user.id;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < filesToUpload.length; i++) {
        const audioBlob = filesToUpload[i];
        setUploadProgress({ current: i + 1, total: filesToUpload.length });

        try {
          const fileExt = activeTab === 'upload' && audioBlob instanceof File
            ? audioBlob.name.split('.').pop() || 'm4a'
            : 'webm';
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const storagePath = `${DEFAULT_WORKSPACE_ID}/${userId}/${fileName}`;

          // Get audio metadata first to determine if chunking is needed
          const audioMeta = await getAudioMetadata(audioBlob);
          
          // Upload file to storage (server-side worker will handle transcription)
          const { error: uploadError } = await supabase.storage
            .from('voice-transcriptions')
            .upload(storagePath, audioBlob);

          if (uploadError) throw uploadError;

          // Create job as "queued" — the transcription-worker cron will pick it up
          const job = await createTranscription.mutateAsync({
            storage_path: storagePath,
            source: activeTab === 'upload' ? 'upload' : 'recording',
            lead_id: entitySelection.leadId || null,
            lead_contact_id: entitySelection.leadContactId || null,
            project_id: entitySelection.projectId || null,
            solution_id: entitySelection.solutionId || null,
            meeting_note_id: entitySelection.meetingNoteId || null,
            auto_create_tasks: true,
            prompt_profile_id: promptProfileId || null,
            transcription_date: transcriptionDate || null,
            original_filename: audioBlob instanceof File ? audioBlob.name : null,
            file_size_bytes: audioBlob.size,
            duration_seconds: audioMeta.duration,
            audio_format: audioMeta.format,
            analysis_context: analysisContext.trim() || null,
            expected_participants: expectedParticipants.length > 0 ? expectedParticipants : null,
            quality_mode: qualityMode,
          });

          // Fire-and-forget: also trigger processing immediately for fast results
          // If user navigates away, the worker cron will pick it up
          processTranscription.mutate({ jobId: job.id });
          successCount++;
        } catch (error) {
          console.error(`Error uploading file ${i + 1}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} transcription${successCount > 1 ? 's' : ''} lancée${successCount > 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} fichier${errorCount > 1 ? 's' : ''} en erreur`);
      }

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Échec de l\'upload'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      // chunking progress removed
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle transcription</DialogTitle>
          <DialogDescription>
            Importez un fichier audio ou enregistrez directement pour générer un compte-rendu IA
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'record')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importer
            </TabsTrigger>
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Enregistrer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium">{selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour modifier la sélection</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Cliquez ou glissez des fichiers audio
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP3, M4A, WAV, WebM (max 500 MB par fichier) — <strong>Multi-sélection possible</strong>
                  </p>
                </div>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="truncate flex-1 mr-2">{file.name}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="record" className="space-y-4 pt-4">
            <div className="border rounded-lg p-8 text-center">
              {recordedBlob ? (
                <div className="space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="font-medium">Enregistrement terminé</p>
                  <audio controls src={URL.createObjectURL(recordedBlob)} className="mx-auto" />
                  <Button variant="outline" size="sm" onClick={() => setRecordedBlob(null)}>
                    Recommencer
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "h-20 w-20 rounded-full flex items-center justify-center mx-auto transition-all",
                      isRecording 
                        ? "bg-destructive animate-pulse" 
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isRecording ? (
                      <MicOff className="h-8 w-8 text-white" />
                    ) : (
                      <Mic className="h-8 w-8 text-white" />
                    )}
                  </button>
                  <p className="text-muted-foreground">
                    {isRecording ? "Cliquez pour arrêter" : "Cliquez pour enregistrer"}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Transcription date + Entity linking */}
        <div className="space-y-4 pt-2">
          {/* Date de la transcription */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date de la réunion/transcription
            </Label>
            <Input
              type="date"
              value={transcriptionDate}
              onChange={(e) => setTranscriptionDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Par défaut aujourd'hui. Modifiez si l'enregistrement date d'un autre jour.
            </p>
          </div>

          {/* Multi-entity linking */}
          <TranscriptionEntityLinker
            value={entitySelection}
            onChange={setEntitySelection}
            leads={leads}
            leadContacts={leadContacts}
            projects={projects}
            solutions={solutions}
            meetingNotes={meetingNotes}
          />

          {/* Prompt profile */}
          <div className="space-y-2">
            <Label>Profil de synthèse</Label>
            <Select value={promptProfileId || 'default'} onValueChange={(v) => setPromptProfileId(v === 'default' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Par défaut (RDV commercial)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Par défaut (RDV commercial)</SelectItem>
                {promptProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participants attendus */}
          <ParticipantPicker value={expectedParticipants} onChange={setExpectedParticipants} />

          {/* Suggestions de contacts du Lead */}
          {suggestedContacts.length > 0 && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Contacts liés au Lead sélectionné
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedContacts.map((c) => (
                  <Button
                    key={c.entity_id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                    onClick={() => {
                      setExpectedParticipants(prev => [...prev, c]);
                      setSuggestedContacts(prev => prev.filter(s => s.entity_id !== c.entity_id));
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {c.name}
                    {c.company && <span className="text-muted-foreground">· {c.company}</span>}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Contexte d'analyse */}
          <div className="space-y-2">
            <Label>
              Contexte d'analyse (optionnel)
            </Label>
            <textarea
              value={analysisContext}
              onChange={(e) => setAnalysisContext(e.target.value)}
              placeholder="Ex: RDV de découverte avec prospect secteur santé, objectif: présenter notre offre audit SI..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Ce contexte aide l'IA à mieux comprendre et structurer l'analyse.
            </p>
          </div>

          {/* Qualité de transcription */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {qualityMode === 'high' ? (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                ) : (
                  <Zap className="h-4 w-4 text-primary" />
                )}
                {qualityMode === 'high' ? 'Haute précision (best)' : 'Standard (nano)'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {qualityMode === 'high' 
                  ? 'Modèle premium + analyse enrichie — ~4x plus cher, pour audio bruyant ou multi-langues'
                  : 'Rapide et économique — optimal pour enregistrements clairs en français'}
              </p>
            </div>
            <Switch 
              checked={qualityMode === 'high'} 
              onCheckedChange={(checked) => setQualityMode(checked ? 'high' : 'standard')} 
            />
          </div>

          {/* Auto create tasks - now always on */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Création auto des tâches
              </Label>
              <p className="text-xs text-muted-foreground">
                Toutes les actions détectées génèrent des tâches automatiquement
              </p>
            </div>
            <Switch checked={true} disabled className="opacity-50" />
          </div>
        </div>

        {/* Server-side processing — no client-side progress needed */}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUploading || (selectedFiles.length === 0 && !recordedBlob)}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadProgress.total > 1 
                  ? `Upload ${uploadProgress.current}/${uploadProgress.total}...`
                  : 'Upload en cours...'}
              </>
            ) : (
              selectedFiles.length > 1 
                ? `Lancer ${selectedFiles.length} transcriptions`
                : 'Lancer la transcription'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
