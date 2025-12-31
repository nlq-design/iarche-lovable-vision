import { useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCockpitVoiceTranscriptions, TRANSCRIPTION_STATUSES } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { CreateTranscriptionModal } from '@/components/cockpit/transcriptions/CreateTranscriptionModal';
import { TranscriptionDetailSheet } from '@/components/cockpit/transcriptions/TranscriptionDetailSheet';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock className="h-4 w-4" />,
  transcribing: <Loader2 className="h-4 w-4 animate-spin" />,
  analyzing: <Loader2 className="h-4 w-4 animate-spin" />,
  done: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

export default function CockpitTranscriptions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);

  const { transcriptions, isLoading, stats, refetch } = useCockpitVoiceTranscriptions();

  const filteredTranscriptions = transcriptions.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.summary?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    return TRANSCRIPTION_STATUSES.find(s => s.value === status) || TRANSCRIPTION_STATUSES[0];
  };

  return (
    <CockpitLayout>
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Transcriptions</h1>
            <p className="text-sm text-muted-foreground">
              Enregistrements audio en comptes-rendus
            </p>
          </div>
          <Button size="sm" className="h-8 text-sm w-fit" onClick={() => setCreateModalOpen(true)}>
            <Mic className="h-3.5 w-3.5 mr-1.5" />
            Nouvelle transcription
          </Button>
        </div>

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
                  onClick={() => setSelectedTranscription(transcription.id)}
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
                          {transcription.summary?.title || 'Transcription en cours...'}
                        </h3>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(transcription.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </span>
                          
                          {transcription.lead && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {transcription.lead.name}
                            </span>
                          )}
                          
                          {transcription.project && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {transcription.project.name}
                            </span>
                          )}
                          
                          {transcription.solution && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {transcription.solution.title}
                            </span>
                          )}
                        </div>

                        {transcription.summary?.executive_summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {transcription.summary.executive_summary}
                          </p>
                        )}
                      </div>

                      {transcription.summary?.extraction_quality && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Confiance</p>
                          <p className="text-lg font-semibold">
                            {transcription.summary.extraction_quality.confidence}%
                          </p>
                        </div>
                      )}
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
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          refetch();
          setCreateModalOpen(false);
        }}
      />

      {/* Detail Sheet */}
      <TranscriptionDetailSheet
        transcriptionId={selectedTranscription}
        open={!!selectedTranscription}
        onOpenChange={(open) => !open && setSelectedTranscription(null)}
      />
    </CockpitLayout>
  );
}
