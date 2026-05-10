import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Video, Download, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ZoomRecording {
  meeting_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  has_audio: boolean;
  audio_format: string | null;
  audio_size: number | null;
  already_imported: boolean;
  recording_count: number;
}

interface ZoomListWarning {
  message: string;
  error_code: string | null;
  required_scopes: string[] | null;
  zoom_error: string | null;
  diagnostic: {
    range?: { from: string; to: string };
    source_checks?: Array<{
      label: string;
      endpoint: string;
      ok: boolean;
      status: number;
      recordings_count?: number;
      users_count?: number;
      zoom_error?: string | null;
    }>;
  } | null;
}

interface ZoomImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ScopeCheck {
  ok: boolean;
  ready?: boolean;
  granted_scopes?: string[];
  required_scopes?: string[];
  optional_scopes?: string[];
  missing_required?: string[];
  missing_optional?: string[];
  error?: string;
}

export function ZoomImportModal({ open, onOpenChange, onImportComplete }: ZoomImportModalProps) {
  const [recordings, setRecordings] = useState<ZoomRecording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [warning, setWarning] = useState<ZoomListWarning | null>(null);
  const [scopeCheck, setScopeCheck] = useState<ScopeCheck | null>(null);
  const [isCheckingScopes, setIsCheckingScopes] = useState(false);

  // Vérification automatique des scopes Zoom dès l'ouverture du modal
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setIsCheckingScopes(true);
      try {
        const { data, error } = await supabase.functions.invoke('zoom-import-recordings', {
          body: { action: 'check_scopes' },
        });
        if (cancelled) return;
        if (error) throw error;
        setScopeCheck(data as ScopeCheck);
        if (data?.ok && !data.ready) {
          toast.warning(`Zoom : ${data.missing_required?.length ?? 0} scope(s) requis manquant(s)`);
        }
      } catch (e: any) {
        if (!cancelled) setScopeCheck({ ok: false, error: e.message });
      } finally {
        if (!cancelled) setIsCheckingScopes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const loadRecordings = async () => {
    setIsLoading(true);
    setWarning(null);
    try {
      const { data, error } = await supabase.functions.invoke('zoom-import-recordings', {
        body: { action: 'list' },
      });
      if (error) throw error;
      setRecordings(data.recordings || []);
      setHasLoaded(true);
      if (data.scope_check) setScopeCheck(data.scope_check);
      if (data.warning) {
        setWarning({
          message: data.warning,
          error_code: data.error_code || null,
          required_scopes: data.required_scopes || null,
          zoom_error: data.zoom_error || null,
          diagnostic: data.diagnostic || null,
        });
        toast.warning('Zoom connecté, mais accès incomplet aux enregistrements');
      } else if ((data.recordings || []).length === 0) {
        toast.info('Aucun enregistrement Zoom trouvé sur les 30 derniers jours');
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message || 'Impossible de charger les enregistrements'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const importRecording = async (meetingId: string) => {
    setImportingIds(prev => new Set(prev).add(meetingId));
    try {
      const { data, error } = await supabase.functions.invoke('zoom-import-recordings', {
        body: { action: 'import', meeting_id: meetingId },
      });
      if (error) throw error;
      
      toast.success(`Enregistrement "${data.meeting_topic}" importé et mis en file de transcription`);
      
      // Mark as imported locally
      setRecordings(prev => prev.map(r => 
        r.meeting_id === meetingId ? { ...r, already_imported: true } : r
      ));
      onImportComplete();
    } catch (err: any) {
      toast.error(`Erreur d'import: ${err.message}`);
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(meetingId);
        return next;
      });
    }
  };

  const filteredRecordings = recordings.filter(r => {
    if (!searchQuery) return true;
    return r.topic.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Importer depuis Zoom
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          {!hasLoaded ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Récupérer les enregistrements cloud Zoom des 30 derniers jours
              </p>
              <Button onClick={loadRecordings} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                Charger les enregistrements
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={loadRecordings} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '↻'}
                </Button>
              </div>

              {warning && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-1 text-xs">
                      <p className="font-medium text-destructive">
                        Accès aux enregistrements Zoom non autorisé
                      </p>
                      <p className="text-muted-foreground">{warning.message}</p>
                      {warning.required_scopes && warning.required_scopes.length > 0 && (
                        <ul className="list-disc list-inside text-muted-foreground">
                          {warning.required_scopes.map((s) => (
                            <li key={s}><code className="text-[11px]">{s}</code></li>
                          ))}
                        </ul>
                      )}
                      {warning.zoom_error && (
                        <p className="text-muted-foreground italic">Zoom: {warning.zoom_error}</p>
                      )}
                      {warning.diagnostic?.source_checks && warning.diagnostic.source_checks.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {warning.diagnostic.source_checks.map((check) => (
                            <div key={check.endpoint} className="flex items-start justify-between gap-3 rounded-md border bg-background/60 px-2 py-1.5">
                              <div>
                                <p className="font-medium text-foreground">{check.label}</p>
                                <p className="text-muted-foreground">{check.endpoint}</p>
                              </div>
                              <Badge variant={check.ok ? 'secondary' : 'destructive'} className="shrink-0 text-[11px]">
                                HTTP {check.status} • {check.recordings_count ?? check.users_count ?? 0}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredRecordings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {warning ? 'Aucun enregistrement accessible (voir avertissement ci-dessus)' : 'Aucun enregistrement trouvé'}
                  </p>
                ) : (
                  filteredRecordings.map(rec => (
                    <div
                      key={rec.meeting_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-sm truncate">{rec.topic}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>
                            {format(new Date(rec.start_time), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </span>
                          <span>{formatDuration(rec.duration)}</span>
                          {rec.audio_size && <span>{formatSize(rec.audio_size)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!rec.has_audio && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pas d'audio
                          </Badge>
                        )}
                        {rec.already_imported ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            Importé
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={!rec.has_audio || importingIds.has(rec.meeting_id)}
                            onClick={() => importRecording(rec.meeting_id)}
                          >
                            {importingIds.has(rec.meeting_id) ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 mr-1" />
                            )}
                            Importer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {recordings.length} enregistrement(s) • {recordings.filter(r => r.already_imported).length} déjà importé(s)
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
