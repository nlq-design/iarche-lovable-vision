import { useState, useCallback, useRef } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  Upload,
  Search,
  FileAudio,
  User,
  FolderOpen,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ListTodo,
  RefreshCw,
  Handshake,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { CreateTranscriptionModal } from '@/components/cockpit/transcriptions/CreateTranscriptionModal';
import { toast } from 'sonner';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock className="h-4 w-4" />,
  transcribing: <Loader2 className="h-4 w-4 animate-spin" />,
  analyzing: <Loader2 className="h-4 w-4 animate-spin" />,
  done: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

export default function CockpitTranscriptions() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'audio/flac', 'audio/aac'];

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(f => 
      AUDIO_TYPES.includes(f.type) || 
      /\.(mp3|wav|ogg|m4a|webm|flac|aac|mp4)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      toast.error('Aucun fichier audio détecté. Formats acceptés : MP3, WAV, M4A, OGG, FLAC, AAC');
      return;
    }

    setDroppedFiles(audioFiles);
    setCreateModalOpen(true);
  }, []);

  const { transcriptions, isLoading, stats, refetch, processTranscription } = useCockpitVoiceTranscriptions();

  // Batch re-analyze all completed transcriptions
  const handleBatchReanalyze = async () => {
    const doneTranscriptions = transcriptions.filter(t => t.status === 'done');
    if (doneTranscriptions.length === 0) {
      toast.info('Aucune transcription terminée à ré-analyser');
      return;
    }

    setIsReanalyzing(true);
    setReanalyzeProgress({ current: 0, total: doneTranscriptions.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < doneTranscriptions.length; i++) {
      const t = doneTranscriptions[i];
      try {
        await processTranscription.mutateAsync({ jobId: t.id, forceReanalyze: true });
        successCount++;
      } catch {
        errorCount++;
      }
      setReanalyzeProgress({ current: i + 1, total: doneTranscriptions.length });
    }

    setIsReanalyzing(false);
    setReanalyzeProgress({ current: 0, total: 0 });
    refetch();
    
    if (errorCount === 0) {
      toast.success(`${successCount} transcription(s) ré-analysée(s) avec succès`);
    } else {
      toast.warning(`${successCount} succès, ${errorCount} erreur(s)`);
    }
  };

  const filteredTranscriptions = transcriptions.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      t.title?.toLowerCase().includes(searchLower) ||
      (typeof t.summary?.title === 'string' && t.summary.title.toLowerCase().includes(searchLower)) ||
      t.lead?.name?.toLowerCase().includes(searchLower) ||
      t.lead?.company?.toLowerCase().includes(searchLower) ||
      t.project?.name?.toLowerCase().includes(searchLower) ||
      t.solution?.title?.toLowerCase().includes(searchLower) ||
      t.lead_contact?.name?.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    return TRANSCRIPTION_STATUSES.find(s => s.value === status) || TRANSCRIPTION_STATUSES[0];
  };

  return (
    <CockpitLayout>
      <div 
        className="p-5 space-y-5 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
            <Upload className="h-12 w-12 text-primary mb-3 animate-bounce" />
            <p className="text-lg font-semibold text-primary">Déposez vos fichiers audio ici</p>
            <p className="text-sm text-muted-foreground mt-1">MP3, WAV, M4A, OGG, FLAC, AAC</p>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Transcriptions</h1>
            <p className="text-sm text-muted-foreground">
              Enregistrements audio en comptes-rendus
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.done > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-sm"
                onClick={handleBatchReanalyze}
                disabled={isReanalyzing}
              >
                {isReanalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Ré-analyser toutes
              </Button>
            )}
            <Button size="sm" className="h-8 text-sm w-fit" onClick={() => setCreateModalOpen(true)}>
              <Mic className="h-3.5 w-3.5 mr-1.5" />
              Nouvelle transcription
            </Button>
          </div>
        </div>

        {/* Progress bar for batch re-analyze */}
        {isReanalyzing && reanalyzeProgress.total > 0 && (
          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Ré-analyse en cours...</span>
              </div>
              <span className="text-muted-foreground">
                {reanalyzeProgress.current} / {reanalyzeProgress.total}
              </span>
            </div>
            <Progress 
              value={(reanalyzeProgress.current / reanalyzeProgress.total) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Environ {Math.ceil((reanalyzeProgress.total - reanalyzeProgress.current) * 0.5)} min restantes
            </p>
          </div>
        )}

        {/* Stats inline */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/40 rounded-lg border text-sm">
          <div className="flex items-center gap-2">
            <FileAudio className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Terminées</span>
            <span className="font-semibold text-green-600">{stats.done}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">En cours</span>
            <span className="font-semibold text-blue-600">{stats.pending}</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">Erreurs</span>
            <span className="font-semibold text-destructive">{stats.errors}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {TRANSCRIPTION_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transcriptions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTranscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">Aucune transcription</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Commencez par enregistrer ou importer un audio
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer un audio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTranscriptions.map(transcription => {
              const statusConfig = getStatusConfig(transcription.status);
              
              return (
                <Card
                  key={transcription.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/cockpit/transcriptions/${transcription.slug || transcription.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                            {STATUS_ICONS[transcription.status]}
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {transcription.source === 'upload' ? (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                Import
                              </>
                            ) : (
                              <>
                                <Mic className="h-3 w-3 mr-1" />
                                Enregistrement
                              </>
                            )}
                          </Badge>
                        </div>
                        
                         <h3 className="font-medium truncate">
                           {transcription.title 
                             ? transcription.title
                             : transcription.summary?.title
                               ? (typeof transcription.summary.title === 'string'
                                 ? transcription.summary.title
                                 : JSON.stringify(transcription.summary.title))
                               : 'Transcription en cours...'}
                         </h3>
                        
                         {/* Date */}
                         <p className="text-xs text-muted-foreground mt-1">
                           {transcription.transcription_date 
                             ? format(new Date(transcription.transcription_date), 'dd MMM yyyy', { locale: fr })
                             : format(new Date(transcription.created_at), 'dd MMM yyyy', { locale: fr })}
                         </p>

                         {/* Liens entités - TOUJOURS AFFICHÉ */}
                         <div className="flex flex-wrap items-center gap-2 mt-2">
                           {/* Lead */}
                           {transcription.lead ? (
                             <Badge 
                               variant="secondary" 
                               className="text-xs h-5 cursor-pointer hover:bg-primary/20"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 navigate(`/cockpit/leads/${transcription.lead!.id}`);
                               }}
                             >
                               <User className="h-3 w-3 mr-1" />
                               {transcription.lead.name}
                             </Badge>
                           ) : null}
                           
                           {/* Contact */}
                           {transcription.lead_contact && (
                             <Badge variant="outline" className="text-xs h-5">
                               <Users className="h-3 w-3 mr-1" />
                               {transcription.lead_contact.name}
                             </Badge>
                           )}
                           
                           {/* Project */}
                           {transcription.project ? (
                             <Badge 
                               variant="secondary" 
                               className="text-xs h-5 cursor-pointer hover:bg-primary/20"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 navigate(`/cockpit/projects/${transcription.project!.id}`);
                               }}
                             >
                               <FolderOpen className="h-3 w-3 mr-1" />
                               {transcription.project.name}
                             </Badge>
                           ) : null}
                           
                           {/* Solution */}
                           {transcription.solution && (
                             <Badge 
                               variant="outline" 
                               className="text-xs h-5 cursor-pointer hover:bg-primary/20"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 navigate(`/cockpit/solutions/${transcription.solution_id}`);
                               }}
                             >
                               <Package className="h-3 w-3 mr-1" />
                               {transcription.solution.title}
                             </Badge>
                           )}

                           {/* Partners */}
                           {transcription.partners && transcription.partners.length > 0 && (
                             transcription.partners.map((p) => (
                               p.partner && (
                                 <Badge 
                                   key={p.partner.id}
                                   variant="outline" 
                                   className="text-xs h-5 cursor-pointer hover:bg-primary/20 border-amber-500/50 text-amber-700 dark:text-amber-400"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     navigate(`/cockpit/partenaires/${p.partner.slug || p.partner.id}`);
                                   }}
                                 >
                                   <Handshake className="h-3 w-3 mr-1" />
                                   {p.partner.name}
                                 </Badge>
                               )
                             ))
                           )}

                           {/* Placeholder si aucun lien */}
                           {!transcription.lead && !transcription.project && !transcription.solution && !transcription.lead_contact && (!transcription.partners || transcription.partners.length === 0) && (
                             <Badge variant="outline" className="text-xs h-5 text-muted-foreground border-dashed">
                               Non lié
                             </Badge>
                           )}
                         </div>

                         {/* Description - TOUJOURS AFFICHÉE */}
                         <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                           {transcription.summary?.executive_summary
                             ? (typeof transcription.summary.executive_summary === 'string'
                                 ? transcription.summary.executive_summary
                                 : JSON.stringify(transcription.summary.executive_summary))
                             : 'Pas de résumé disponible'}
                         </p>

                         {/* Footer - TOUJOURS AFFICHÉ */}
                         <div className="flex items-center gap-3 mt-3">
                           {/* Actions count - toujours affiché */}
                           <Badge 
                             variant={transcription.summary?.action_items && transcription.summary.action_items.length > 0 ? "default" : "outline"} 
                             className={`text-xs h-5 ${transcription.summary?.action_items && transcription.summary.action_items.length > 0 ? 'bg-primary/80' : 'text-muted-foreground border-dashed'}`}
                           >
                             <ListTodo className="h-3 w-3 mr-1" />
                             {transcription.summary?.action_items?.length || 0} action{(transcription.summary?.action_items?.length || 0) !== 1 ? 's' : ''}
                           </Badge>

                           {/* Confiance - toujours affiché */}
                           <span className="text-xs text-muted-foreground ml-auto">
                             Confiance : {transcription.summary?.extraction_quality?.confidence != null
                               ? `${transcription.summary.extraction_quality.confidence <= 1 
                                   ? Math.round(transcription.summary.extraction_quality.confidence * 100) 
                                   : Math.round(transcription.summary.extraction_quality.confidence)}%`
                               : '—'}
                           </span>
                         </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateTranscriptionModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setDroppedFiles([]);
        }}
        onSuccess={() => {
          refetch();
          setCreateModalOpen(false);
          setDroppedFiles([]);
        }}
        defaultFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
      />
    </CockpitLayout>
  );
}
