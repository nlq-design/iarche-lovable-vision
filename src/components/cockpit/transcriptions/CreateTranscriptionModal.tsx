import { useState, useRef, useCallback } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Upload, Mic, MicOff, Loader2, User, FolderOpen, Package, Check, ChevronsUpDown, FileText, CalendarIcon, Scissors } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, useAIPromptProfiles } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads, useCockpitProjects, useCockpitMeetingNotes } from '@/hooks/cockpit';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  needsChunking, 
  estimateChunks, 
  transcribeLargeAudio, 
  type TranscriptionProgress 
} from '@/lib/audioChunking';

interface CreateTranscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultLeadId?: string;
  defaultProjectId?: string;
  defaultSolutionId?: string;
  defaultMeetingNoteId?: string;
}

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MAX_SINGLE_FILE_SIZE = 24 * 1024 * 1024; // 24MB for direct upload
const MAX_TOTAL_FILE_SIZE = 500 * 1024 * 1024; // 500MB max with chunking

export function CreateTranscriptionModal({
  open,
  onOpenChange,
  onSuccess,
  defaultLeadId,
  defaultProjectId,
  defaultSolutionId,
  defaultMeetingNoteId,
}: CreateTranscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [chunkingProgress, setChunkingProgress] = useState<TranscriptionProgress | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [entityType, setEntityType] = useState<'lead' | 'project' | 'solution' | 'meeting_note' | 'none'>(
    defaultLeadId ? 'lead' : defaultProjectId ? 'project' : defaultSolutionId ? 'solution' : defaultMeetingNoteId ? 'meeting_note' : 'none'
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    defaultLeadId || defaultProjectId || defaultSolutionId || defaultMeetingNoteId || ''
  );
  const [promptProfileId, setPromptProfileId] = useState<string>('');
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [entitySearchOpen, setEntitySearchOpen] = useState(false);
  const [transcriptionDate, setTranscriptionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [analysisContext, setAnalysisContext] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createTranscription, processTranscription } = useCockpitVoiceTranscriptions();
  const { data: promptProfiles = [] } = useAIPromptProfiles('transcription');
  const { leads = [] } = useCockpitLeads();
  const { projects = [] } = useCockpitProjects();
  const meetingNotesResult = useCockpitMeetingNotes();
  const meetingNotes = meetingNotesResult?.meetingNotes ?? [];
  
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

  const resetForm = useCallback(() => {
    setSelectedFiles([]);
    setRecordedBlob(null);
    setEntityType('none');
    setSelectedEntityId('');
    setPromptProfileId('');
    setAutoCreateTasks(true);
    setTranscriptionDate(format(new Date(), 'yyyy-MM-dd'));
    setAnalysisContext('');
    setUploadProgress({ current: 0, total: 0 });
    setChunkingProgress(null);
  }, []);

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

    // Check for files that are too large even for chunking
    const tooLarge = filesToUpload.find((f) => f.size > MAX_TOTAL_FILE_SIZE);
    if (tooLarge) {
      const name = tooLarge instanceof File ? tooLarge.name : 'audio';
      toast.error(`Fichier trop volumineux (max ${(MAX_TOTAL_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB) : ${name}`);
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
          
          // Check if file needs chunking (> 24MB OR duration > 20 min)
          const requiresChunking = needsChunking(audioBlob, audioMeta.duration);
          
          if (requiresChunking) {
            // Large/long file: chunk + transcribe client-side, then create job with transcript
            const estimatedChunks = estimateChunks(audioBlob.size);
            const reason = audioMeta.duration && audioMeta.duration > 20 * 60 
              ? `Audio long (${Math.round(audioMeta.duration / 60)} min)`
              : `Fichier volumineux (${(audioBlob.size / (1024 * 1024)).toFixed(1)} MB)`;
            toast.info(`${reason} - Découpage en ~${estimatedChunks} segments...`);
            
            try {
              // Upload original file to storage AND transcribe in parallel
              const uploadPromise = supabase.storage
                .from('voice-transcriptions')
                .upload(storagePath, audioBlob);
              
              // Transcribe with chunking (audioMeta already fetched above)
              const transcriptPromise = transcribeLargeAudio(
                audioBlob,
                'fr',
                (progress) => setChunkingProgress(progress)
              );
              
              // Wait for both operations
              const [uploadResult, transcriptText] = await Promise.all([
                uploadPromise,
                transcriptPromise
              ]);
              
              // Determine final storage path: use real path if upload succeeded, fallback otherwise
              let finalStoragePath = storagePath;
              if (uploadResult.error) {
                console.warn('[Chunked Upload] Storage upload failed, audio will be unavailable:', uploadResult.error.message);
                finalStoragePath = `${DEFAULT_WORKSPACE_ID}/${userId}/chunked_${fileName}_no_file`;
              }

              // Create job with pre-transcribed text and metadata
              const job = await createTranscription.mutateAsync({
                storage_path: finalStoragePath,
                source: activeTab === 'upload' ? 'upload' : 'recording',
                lead_id: entityType === 'lead' ? selectedEntityId : null,
                project_id: entityType === 'project' ? selectedEntityId : null,
                solution_id: entityType === 'solution' ? selectedEntityId : null,
                meeting_note_id: entityType === 'meeting_note' ? selectedEntityId : null,
                auto_create_tasks: true,
                prompt_profile_id: promptProfileId || null,
                transcription_date: transcriptionDate || null,
                pre_transcribed_text: transcriptText,
                original_filename: audioBlob instanceof File ? audioBlob.name : null,
                file_size_bytes: audioBlob.size,
                duration_seconds: audioMeta.duration,
                audio_format: audioMeta.format,
                analysis_context: analysisContext.trim() || null,
              });

              // Process for AI synthesis (skip Whisper, go straight to LLM)
              processTranscription.mutate({ jobId: job.id });
              successCount++;
              setChunkingProgress(null);
              
            } catch (chunkError) {
              console.error(`Chunking error for file ${i + 1}:`, chunkError);
              setChunkingProgress(null);
              toast.error(`Erreur de découpage: ${chunkError instanceof Error ? chunkError.message : 'Échec'}`);
              errorCount++;
            }
          } else {
            // Small/short file: standard flow (audioMeta already fetched above)
            const { error: uploadError } = await supabase.storage
              .from('voice-transcriptions')
              .upload(storagePath, audioBlob);

            if (uploadError) throw uploadError;

            const job = await createTranscription.mutateAsync({
              storage_path: storagePath,
              source: activeTab === 'upload' ? 'upload' : 'recording',
              lead_id: entityType === 'lead' ? selectedEntityId : null,
              project_id: entityType === 'project' ? selectedEntityId : null,
              solution_id: entityType === 'solution' ? selectedEntityId : null,
              meeting_note_id: entityType === 'meeting_note' ? selectedEntityId : null,
              auto_create_tasks: true,
              prompt_profile_id: promptProfileId || null,
              transcription_date: transcriptionDate || null,
              original_filename: audioBlob instanceof File ? audioBlob.name : null,
              file_size_bytes: audioBlob.size,
              duration_seconds: audioMeta.duration,
              audio_format: audioMeta.format,
              analysis_context: analysisContext.trim() || null,
            });

            processTranscription.mutate({ jobId: job.id });
            successCount++;
          }
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
      setChunkingProgress(null);
    }
  };

  const getEntityOptions = () => {
    switch (entityType) {
      case 'lead':
        return leads.map(l => ({ id: l.id, label: `${l.name}${l.company ? ` - ${l.company}` : ''}` }));
      case 'project':
        return projects.map(p => ({ id: p.id, label: p.name }));
      case 'solution':
        return solutions.map(s => ({ id: s.id, label: s.title }));
      case 'meeting_note':
        return (meetingNotes || []).map(m => ({ 
          id: m.id, 
          label: m.objectives ? m.objectives.substring(0, 50) + (m.objectives.length > 50 ? '...' : '') : `CR du ${new Date(m.created_at!).toLocaleDateString('fr-FR')}`
        }));
      default:
        return [];
    }
  };

  const selectedEntityLabel = getEntityOptions().find(e => e.id === selectedEntityId)?.label;

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

          <div className="space-y-2">
            <Label>Lier à une entité (optionnel)</Label>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v as any); setSelectedEntityId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="lead">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Lead
                  </div>
                </SelectItem>
                <SelectItem value="project">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Projet
                  </div>
                </SelectItem>
                <SelectItem value="solution">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Solution
                  </div>
                </SelectItem>
                <SelectItem value="meeting_note">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Compte-rendu (CR)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {entityType !== 'none' && (
            <Popover open={entitySearchOpen} onOpenChange={setEntitySearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedEntityLabel || `Sélectionner ${entityType === 'lead' ? 'un lead' : entityType === 'project' ? 'un projet' : entityType === 'solution' ? 'une solution' : 'un CR'}...`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher..." />
                  <CommandList>
                    <CommandEmpty>Aucun résultat</CommandEmpty>
                    <CommandGroup>
                      {getEntityOptions().map(option => (
                        <CommandItem
                          key={option.id}
                          value={option.label}
                          onSelect={() => {
                            setSelectedEntityId(option.id);
                            setEntitySearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedEntityId === option.id ? "opacity-100" : "opacity-0")} />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

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

          {/* Contexte d'analyse */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
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

        {/* Chunking Progress */}
        {chunkingProgress && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="h-4 w-4 animate-pulse text-primary" />
              <span className="font-medium">{chunkingProgress.message}</span>
            </div>
            {chunkingProgress.totalChunks && chunkingProgress.currentChunk && (
              <Progress 
                value={(chunkingProgress.currentChunk / chunkingProgress.totalChunks) * 100} 
                className="h-2"
              />
            )}
          </div>
        )}

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
                {chunkingProgress 
                  ? 'Découpage...'
                  : uploadProgress.total > 1 
                    ? `${uploadProgress.current}/${uploadProgress.total}...`
                    : 'Traitement...'}
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
