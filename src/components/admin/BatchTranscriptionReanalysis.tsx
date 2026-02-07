import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  Clock,
  DollarSign,
} from 'lucide-react';

interface TranscriptionJob {
  id: string;
  title: string | null;
  status: string;
  has_enriched: boolean;
  duration_seconds: number | null;
  storage_path: string;
}

interface ProcessingResult {
  id: string;
  title: string | null;
  success: boolean;
  error?: string;
  duration_ms?: number;
}

export default function BatchTranscriptionReanalysis() {
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rerunLLM, setRerunLLM] = useState(true);
  const abortRef = useRef(false);

  // Scan for transcriptions needing enrichment
  const scanTranscriptions = useCallback(async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase
        .from('voice_transcriptions')
        .select('id, title, status, duration_seconds, storage_path, ai_metadata')
        .eq('status', 'done')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const needsEnrichment = (data || []).filter(t => {
        const meta = t.ai_metadata as Record<string, unknown> | null;
        const features = meta?.features_enabled as string[] | undefined;
        return !features || !features.includes('best_model');
      });

      setJobs(needsEnrichment.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        has_enriched: false,
        duration_seconds: t.duration_seconds,
        storage_path: t.storage_path,
      })));

      setResults([]);
      setCurrentIndex(0);

      toast.success(`${needsEnrichment.length} transcription(s) à enrichir sur ${data?.length ?? 0} total`);
    } catch (err) {
      toast.error('Erreur lors du scan');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Process one transcription
  const processOne = useCallback(async (job: TranscriptionJob): Promise<ProcessingResult> => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('process-voice-transcription', {
        body: {
          job_id: job.id,
          force_retranscribe: true,
          // force_reanalyze is implied by force_retranscribe
        },
      });

      if (error) throw error;

      return {
        id: job.id,
        title: job.title,
        success: true,
        duration_ms: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: job.id,
        title: job.title,
        success: false,
        error: err?.message || 'Erreur inconnue',
        duration_ms: Date.now() - start,
      };
    }
  }, []);

  // Run batch processing
  const startBatch = useCallback(async () => {
    if (jobs.length === 0) return;
    
    setIsProcessing(true);
    abortRef.current = false;
    setResults([]);
    setCurrentIndex(0);

    for (let i = 0; i < jobs.length; i++) {
      if (abortRef.current) {
        toast.info(`Batch arrêté après ${i} transcription(s)`);
        break;
      }

      setCurrentIndex(i);
      const result = await processOne(jobs[i]);
      setResults(prev => [...prev, result]);

      if (result.success) {
        toast.success(`✅ ${result.title || jobs[i].id.slice(0, 8)} enrichi`, { duration: 2000 });
      } else {
        toast.error(`❌ ${result.title || jobs[i].id.slice(0, 8)}: ${result.error}`, { duration: 4000 });
      }

      // Small delay between requests to avoid rate limiting
      if (i < jobs.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsProcessing(false);
    toast.success('Batch terminé !');
  }, [jobs, processOne]);

  const stopBatch = useCallback(() => {
    abortRef.current = true;
  }, []);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const progress = jobs.length > 0 ? (results.length / jobs.length) * 100 : 0;

  // Estimate cost
  const totalDurationHours = jobs.reduce((sum, j) => sum + (j.duration_seconds || 1800) / 3600, 0);
  const estimatedCost = (totalDurationHours * 0.37).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Réanalyse AssemblyAI v11
        </CardTitle>
        <CardDescription>
          Re-soumettre les transcriptions existantes à AssemblyAI avec toutes les fonctionnalités avancées
          (speech_model: best, sentiment, entités, chapitres, modération, détection de langue)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Scan */}
        <div className="flex items-center gap-3">
          <Button
            onClick={scanTranscriptions}
            disabled={isScanning || isProcessing}
            variant="outline"
          >
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Scanner les transcriptions
          </Button>
          
          {jobs.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <strong>{jobs.length}</strong> à enrichir
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{totalDurationHours.toFixed(1)}h audio
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ~${estimatedCost}
              </span>
            </div>
          )}
        </div>

        {/* Options */}
        {jobs.length > 0 && !isProcessing && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                id="rerun-llm"
                checked={rerunLLM}
                onCheckedChange={setRerunLLM}
              />
              <Label htmlFor="rerun-llm" className="text-sm">
                Re-générer aussi la synthèse LLM (recommandé)
              </Label>
            </div>
          </div>
        )}

        {/* Step 2: Process */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {!isProcessing ? (
                <Button onClick={startBatch} className="gap-2">
                  <Play className="h-4 w-4" />
                  Lancer le batch ({jobs.length} transcriptions)
                </Button>
              ) : (
                <Button onClick={stopBatch} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  Arrêter
                </Button>
              )}

              {results.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {successCount}
                  </Badge>
                  {failCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {failCount}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Progress */}
            {(isProcessing || results.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {isProcessing
                      ? `Traitement de "${jobs[currentIndex]?.title || `#${currentIndex + 1}`}"...`
                      : 'Terminé'}
                  </span>
                  <span>{results.length}/{jobs.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Results log */}
            {results.length > 0 && (
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-1.5">
                  {results.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      {r.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[200px]">
                        {r.title || r.id.slice(0, 8)}
                      </span>
                      {r.duration_ms && (
                        <span className="text-muted-foreground">
                          {(r.duration_ms / 1000).toFixed(0)}s
                        </span>
                      )}
                      {r.error && (
                        <span className="text-red-500 truncate max-w-[300px]">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
