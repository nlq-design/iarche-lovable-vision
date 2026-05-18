import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
  ShieldAlert,
  X,
  CheckSquare,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES, type VoiceTranscription } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { CreateTranscriptionModal } from '@/components/cockpit/transcriptions/CreateTranscriptionModal';
import { ZoomImportModal } from '@/components/cockpit/transcriptions/ZoomImportModal';
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
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [solutionFilter, setSolutionFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [linkFilter, setLinkFilter] = useState<string>('all'); // all | linked | unlinked
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [zoomImportOpen, setZoomImportOpen] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, successCount: 0, errorCount: 0, currentJobId: '', currentJobTitle: '', startedAt: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const dragCounterRef = useRef(0);

  // Block navigation when batch is running
  const isProcessingRef = useRef(isProcessingBatch);
  isProcessingRef.current = isProcessingBatch;

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (isProcessingRef.current) {
        window.history.pushState(null, '', window.location.href);
        const leave = window.confirm(
          'Le traitement est en cours. Si vous quittez, il sera interrompu. Quitter quand même ?'
        );
        if (leave) {
          setIsProcessingBatch(false);
          window.history.back();
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!isProcessingBatch) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isProcessingBatch]);

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

  // Build filter option lists from loaded transcriptions
  const leadOptions = useMemo(() => {
    const map = new Map<string, string>();
    transcriptions.forEach(t => { if (t.lead?.id) map.set(t.lead.id, t.lead.name || 'Sans nom'); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transcriptions]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    transcriptions.forEach(t => { if (t.project?.id) map.set(t.project.id, t.project.name || 'Sans nom'); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transcriptions]);

  const solutionOptions = useMemo(() => {
    const map = new Map<string, string>();
    transcriptions.forEach(t => { if (t.solution_id && t.solution?.title) map.set(t.solution_id, t.solution.title); });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transcriptions]);

  const filteredTranscriptions = useMemo(() => {
    return transcriptions.filter(t => {
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
      const matchesLead = leadFilter === 'all' || t.lead?.id === leadFilter;
      const matchesProject = projectFilter === 'all' || t.project?.id === projectFilter;
      const matchesSolution = solutionFilter === 'all' || t.solution_id === solutionFilter;
      const matchesSource = sourceFilter === 'all' || t.source === sourceFilter;

      const hasAnyLink = !!(t.lead || t.project || t.solution || t.lead_contact || (t.partners && t.partners.length > 0));
      const matchesLink = linkFilter === 'all' || (linkFilter === 'linked' ? hasAnyLink : !hasAnyLink);

      return matchesSearch && matchesStatus && matchesLead && matchesProject && matchesSolution && matchesSource && matchesLink;
    });
  }, [transcriptions, searchQuery, statusFilter, leadFilter, projectFilter, solutionFilter, sourceFilter, linkFilter]);

  const activeFiltersCount = [statusFilter, leadFilter, projectFilter, solutionFilter, sourceFilter, linkFilter].filter(v => v !== 'all').length + (searchQuery ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setLeadFilter('all');
    setProjectFilter('all');
    setSolutionFilter('all');
    setSourceFilter('all');
    setLinkFilter('all');
  };

  // Selection helpers
  const selectableIds = useMemo(() => new Set(filteredTranscriptions.filter(t => t.status === 'done').map(t => t.id)), [filteredTranscriptions]);
  const allSelected = selectableIds.size > 0 && [...selectableIds].every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Get display title for a transcription
  const getJobTitle = (t: VoiceTranscription, index: number) => {
    if (t.title) return t.title;
    if (typeof t.summary?.title === 'string') return t.summary.title;
    if (t.original_filename) return t.original_filename;
    return `#${index + 1}`;
  };

  // Batch process: selected or all
  const handleBatchProcess = async (ids?: Set<string>) => {
    const filterIds = ids ?? selectedIds;
    const targets = transcriptions
      .filter(t => (filterIds.size > 0 ? filterIds.has(t.id) : false) && t.status === 'done')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (targets.length === 0) {
      toast.info('Aucune transcription sélectionnée à traiter');
      return;
    }

    setIsProcessingBatch(true);
    setBatchProgress({ current: 0, total: targets.length, successCount: 0, errorCount: 0, currentJobId: '', currentJobTitle: '', startedAt: Date.now() });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const hasAudio = !t.storage_path?.endsWith('_no_file');
      const jobTitle = getJobTitle(t, i);

      setBatchProgress(prev => ({ ...prev, current: i, currentJobId: t.id, currentJobTitle: jobTitle }));

      try {
        const alreadyAssemblyAI = (t.ai_metadata as any)?.source === 'assemblyai';
        if (!hasAudio || alreadyAssemblyAI) {
          await processTranscription.mutateAsync({ jobId: t.id, forceReanalyze: true });
        } else {
          await processTranscription.mutateAsync({ jobId: t.id, forceRetranscribe: true });
        }
        successCount++;
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('Failed to send a request') || msg.includes('AbortError') || msg.includes('Failed to fetch')) {
          console.warn(`[Batch] Job ${t.id} aborted (navigation), stopping`);
          toast.info('Traitement interrompu. Les jobs déjà traités sont sauvegardés.');
          break;
        }
        errorCount++;
        console.error(`[Batch] Job ${t.id} failed:`, err);
      }
      setBatchProgress(prev => ({ ...prev, current: i + 1, successCount, errorCount }));

      if (i < targets.length - 1) {
        const nextItem = targets[i + 1];
        const nextIsLight = nextItem.storage_path?.endsWith('_no_file') || (nextItem.ai_metadata as any)?.source === 'assemblyai';
        await new Promise(r => setTimeout(r, nextIsLight ? 2000 : 5000));
      }
    }

    setIsProcessingBatch(false);
    setBatchProgress({ current: 0, total: 0, successCount: 0, errorCount: 0, currentJobId: '', currentJobTitle: '', startedAt: 0 });
    setSelectedIds(new Set());
    refetch();

    if (errorCount === 0) {
      toast.success(`${successCount} transcription(s) traitée(s) avec succès`);
    } else {
      toast.warning(`${successCount} succès, ${errorCount} erreur(s)`);
    }
  };

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
                onClick={() => handleBatchProcess(new Set(transcriptions.filter(t => t.status === 'done').map(t => t.id)))}
                disabled={isProcessingBatch}
              >
                {isProcessingBatch ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Re-transcrire tout ({stats.done})
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 text-sm" onClick={() => setZoomImportOpen(true)}>
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Import Zoom
            </Button>
            <Button size="sm" className="h-8 text-sm w-fit" onClick={() => setCreateModalOpen(true)}>
              <Mic className="h-3.5 w-3.5 mr-1.5" />
              Nouvelle transcription
            </Button>
          </div>
        </div>

        {/* Batch progress bar */}
        {isProcessingBatch && batchProgress.total > 0 && (() => {
          const elapsed = (Date.now() - batchProgress.startedAt) / 1000;
          const avgPerJob = batchProgress.current > 0 ? elapsed / batchProgress.current : 5;
          const remaining = Math.ceil((batchProgress.total - batchProgress.current) * avgPerJob / 60);
          const pct = Math.round((batchProgress.current / batchProgress.total) * 100);
          return (
            <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">⚠️ Ne quittez pas cette page — traitement en cours</span>
                </div>
                <span className="font-mono text-foreground">
                  {batchProgress.current}/{batchProgress.total} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className="h-2.5" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[50%]">
                  En cours : <span className="font-medium text-foreground">{batchProgress.currentJobTitle}</span>
                </span>
                <div className="flex items-center gap-3">
                  {batchProgress.successCount > 0 && (
                    <span className="text-green-600">✓ {batchProgress.successCount}</span>
                  )}
                  {batchProgress.errorCount > 0 && (
                    <span className="text-destructive">✗ {batchProgress.errorCount}</span>
                  )}
                  <span>~{remaining > 0 ? `${remaining} min` : '< 1 min'} restantes</span>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Select all / Selection toolbar */}
        {selectableIds.size > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Tout sélectionner"
              />
              <span className="text-sm text-muted-foreground">
                {allSelected ? 'Tout désélectionner' : `Tout sélectionner (${selectableIds.size})`}
              </span>
            </div>
          </div>
        )}

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
            {filteredTranscriptions.map((transcription, idx) => {
              const statusConfig = getStatusConfig(transcription.status);
              const isSelectable = transcription.status === 'done';
              const isSelected = selectedIds.has(transcription.id);
              const isCurrentlyProcessing = isProcessingBatch && batchProgress.currentJobId === transcription.id;
              
              return (
                <Card
                  key={transcription.id}
                  className={`cursor-pointer transition-all ${
                    isCurrentlyProcessing
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                      : isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'hover:border-primary/50'
                  }`}
                  onClick={() => navigate(`/cockpit/transcriptions/${transcription.slug || transcription.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      {isSelectable && (
                        <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(transcription.id)}
                            disabled={isProcessingBatch}
                            aria-label={`Sélectionner ${getJobTitle(transcription, idx)}`}
                          />
                        </div>
                      )}
                      {!isSelectable && <div className="w-4" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isCurrentlyProcessing && (
                            <Badge variant="default" className="flex items-center gap-1 bg-primary animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              En cours
                            </Badge>
                          )}
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
                          {transcription.duration_seconds && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {Math.round(transcription.duration_seconds / 60)} min
                            </Badge>
                          )}
                        </div>
                        
                         <h3 className="font-medium line-clamp-2">
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

                         {/* Entity links */}
                         <div className="flex flex-wrap items-center gap-2 mt-2">
                           {transcription.lead && (
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
                           )}
                           
                           {transcription.lead_contact && (
                             <Badge variant="outline" className="text-xs h-5">
                               <Users className="h-3 w-3 mr-1" />
                               {transcription.lead_contact.name}
                             </Badge>
                           )}
                           
                           {transcription.project && (
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
                           )}
                           
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

                           {!transcription.lead && !transcription.project && !transcription.solution && !transcription.lead_contact && (!transcription.partners || transcription.partners.length === 0) && (
                             <Badge variant="outline" className="text-xs h-5 text-muted-foreground border-dashed">
                               Non lié
                             </Badge>
                           )}
                         </div>

                         {/* Summary */}
                         <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                           {transcription.summary?.executive_summary
                             ? (typeof transcription.summary.executive_summary === 'string'
                                 ? transcription.summary.executive_summary
                                 : JSON.stringify(transcription.summary.executive_summary))
                             : 'Pas de résumé disponible'}
                         </p>

                         {/* Footer */}
                         <div className="flex items-center gap-3 mt-3">
                           <Badge 
                             variant={transcription.summary?.action_items && transcription.summary.action_items.length > 0 ? "default" : "outline"} 
                             className={`text-xs h-5 ${transcription.summary?.action_items && transcription.summary.action_items.length > 0 ? 'bg-primary/80' : 'text-muted-foreground border-dashed'}`}
                           >
                             <ListTodo className="h-3 w-3 mr-1" />
                             {transcription.summary?.action_items?.length || 0} action{(transcription.summary?.action_items?.length || 0) !== 1 ? 's' : ''}
                           </Badge>

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

        {/* Floating selection toolbar - rendered via portal to escape overflow:auto */}
        {someSelected && !isProcessingBatch && createPortal(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 bg-card border rounded-xl shadow-xl">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}</span>
            <div className="h-4 w-px bg-border" />
            <Button size="sm" className="h-7 text-xs" onClick={() => handleBatchProcess()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-transcrire la sélection
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
              <X className="h-3 w-3 mr-1" />
              Annuler
            </Button>
          </div>,
          document.body
        )}

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

        {/* Zoom Import Modal */}
        <ZoomImportModal
          open={zoomImportOpen}
          onOpenChange={setZoomImportOpen}
          onImportComplete={() => refetch()}
        />
      </div>
    </CockpitLayout>
  );
}