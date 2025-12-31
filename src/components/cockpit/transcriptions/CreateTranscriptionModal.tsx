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
import { Upload, Mic, MicOff, Loader2, User, FolderOpen, Package, Check, ChevronsUpDown, FileText, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCockpitVoiceTranscriptions, useAIPromptProfiles } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { useCockpitLeads, useCockpitProjects, useCockpitMeetingNotes } from '@/hooks/cockpit';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [entityType, setEntityType] = useState<'lead' | 'project' | 'solution' | 'meeting_note' | 'none'>(
    defaultLeadId ? 'lead' : defaultProjectId ? 'project' : defaultSolutionId ? 'solution' : defaultMeetingNoteId ? 'meeting_note' : 'none'
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    defaultLeadId || defaultProjectId || defaultSolutionId || defaultMeetingNoteId || ''
  );
  const [promptProfileId, setPromptProfileId] = useState<string>('');
  const [autoCreateTasks, setAutoCreateTasks] = useState(true); // Force true by default
  const [entitySearchOpen, setEntitySearchOpen] = useState(false);
  const [transcriptionDate, setTranscriptionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createTranscription, processTranscription } = useCockpitVoiceTranscriptions();
  const { data: promptProfiles = [] } = useAIPromptProfiles('transcription');
  const { leads = [] } = useCockpitLeads();
  const { projects = [] } = useCockpitProjects();
  const { meetingNotes = [] } = useCockpitMeetingNotes();
  
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
    setSelectedFile(null);
    setRecordedBlob(null);
    setEntityType('none');
    setSelectedEntityId('');
    setPromptProfileId('');
    setAutoCreateTasks(true);
    setTranscriptionDate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecordedBlob(null);
    }
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

  const handleSubmit = async () => {
    const audioBlob = activeTab === 'upload' ? selectedFile : recordedBlob;
    if (!audioBlob) {
      toast.error('Veuillez sélectionner ou enregistrer un audio');
      return;
    }

    setIsUploading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Non authentifié');

      const userId = userData.user.id;
      const fileExt = activeTab === 'upload' 
        ? selectedFile?.name.split('.').pop() || 'm4a'
        : 'webm';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${DEFAULT_WORKSPACE_ID}/${userId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('voice-transcriptions')
        .upload(storagePath, audioBlob);

      if (uploadError) throw uploadError;

      // Create job
      const job = await createTranscription.mutateAsync({
        storage_path: storagePath,
        source: activeTab === 'upload' ? 'upload' : 'recording',
        lead_id: entityType === 'lead' ? selectedEntityId : null,
        project_id: entityType === 'project' ? selectedEntityId : null,
        solution_id: entityType === 'solution' ? selectedEntityId : null,
        meeting_note_id: entityType === 'meeting_note' ? selectedEntityId : null,
        auto_create_tasks: true, // Always force true
        prompt_profile_id: promptProfileId || null,
        transcription_date: transcriptionDate || null,
      });

      // Start processing
      processTranscription.mutate(job.id);

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Échec de l\'upload'}`);
    } finally {
      setIsUploading(false);
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
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Cliquez ou glissez un fichier audio
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP3, M4A, WAV, WebM (max 100 MB)
                  </p>
                </div>
              )}
            </div>
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

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUploading || (!selectedFile && !recordedBlob)}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              'Lancer la transcription'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
