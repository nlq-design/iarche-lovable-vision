import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Play, Loader2, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface ScoringResult {
  success: boolean;
  batch_id: string;
  scored: number;
  errors: number;
  details: Array<{ id: string; score: number; success: boolean }>;
}

interface VivierScoringPanelProps {
  pendingCount: number;
  onComplete?: () => void;
}

export function VivierScoringPanel({ pendingCount, onComplete }: VivierScoringPanelProps) {
  const [isScoring, setIsScoring] = useState(false);
  const [autoContinue, setAutoContinue] = useState(false);
  const [sessionErrors, setSessionErrors] = useState(0);
  const [batchSize, setBatchSize] = useState(100);
  const [currentBatch, setCurrentBatch] = useState(0);
  const stopRef = useRef(false);
  const queryClient = useQueryClient();

  // Initial scored count when session started
  const sessionStartScoredRef = useRef(0);
  const initialPendingRef = useRef(0);

  // Real-time scored count from database - polls every 2s when active
  const { data: scoredCount = 0 } = useQuery({
    queryKey: ['viviers-scored-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('viviers')
        .select('*', { count: 'exact', head: true })
        .not('cold_score', 'is', null);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: autoContinue || isScoring ? 2000 : false,
    staleTime: 1000,
  });

  // Total viviers count
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['viviers-total-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('viviers')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });

  // Session scored = current scored - scored when session started
  const sessionScored = Math.max(0, scoredCount - sessionStartScoredRef.current);
  
  // Progress based on initial pending count at session start
  const progress = initialPendingRef.current > 0 
    ? Math.min(100, Math.round((sessionScored / initialPendingRef.current) * 100))
    : totalCount > 0 
      ? Math.round((scoredCount / totalCount) * 100)
      : 0;

  const handleStartScoring = async () => {
    if (pendingCount === 0) {
      toast.info('Aucun lead à scorer');
      return;
    }

    stopRef.current = false;
    setIsScoring(true);
    setCurrentBatch(prev => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke('score-viviers-batch', {
        body: { batch_size: batchSize },
      });

      if (error) throw error;

      const result = data as ScoringResult;
      
      if (result.errors > 0) {
        setSessionErrors(prev => prev + result.errors);
      }

      if (result.scored > 0) {
        toast.success(`Batch ${currentBatch + 1}: ${result.scored} leads scorés`);
        queryClient.invalidateQueries({ queryKey: ['viviers'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-scoring-stats'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-scored-count'] });
        onComplete?.();
      } else if (result.errors > 0) {
        toast.warning(`Batch terminé avec ${result.errors} erreurs`);
      } else {
        toast.info('Aucun lead à scorer dans ce batch');
        setAutoContinue(false);
      }
    } catch (err) {
      console.error('Scoring error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur de scoring');
      setAutoContinue(false);
    } finally {
      setIsScoring(false);
    }
  };

  // Auto-continue effect
  useEffect(() => {
    if (autoContinue && !isScoring && pendingCount > 0 && !stopRef.current) {
      const timer = setTimeout(() => {
        handleStartScoring();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoContinue, isScoring, pendingCount]);

  const handleToggleAutoContinue = (checked: boolean) => {
    if (checked) {
      // Store starting values for progress calculation
      sessionStartScoredRef.current = scoredCount;
      initialPendingRef.current = pendingCount;
      setSessionErrors(0);
      setCurrentBatch(0);
    }
    setAutoContinue(checked);
    stopRef.current = !checked;
  };

  const handleStop = () => {
    stopRef.current = true;
    setAutoContinue(false);
    toast.info('Scoring arrêté');
  };

  const handleReset = () => {
    sessionStartScoredRef.current = scoredCount;
    initialPendingRef.current = 0;
    setSessionErrors(0);
    setCurrentBatch(0);
  };

  // Show progress section when active or has session data
  const showProgress = autoContinue || sessionScored > 0 || currentBatch > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Scoring IA
        </CardTitle>
        <CardDescription>
          Score automatique des leads basé sur la complétude, le secteur, la taille et la localisation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-xl font-bold">{pendingCount.toLocaleString('fr-FR')}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Déjà scorés</p>
            <p className="text-xl font-bold text-primary">{scoredCount.toLocaleString('fr-FR')}</p>
          </div>
        </div>

        {/* Session Progress */}
        {showProgress && (
          <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Session: {sessionScored.toLocaleString('fr-FR')} scorés
                {sessionErrors > 0 && (
                  <span className="text-destructive ml-2">({sessionErrors} erreurs)</span>
                )}
              </span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Batch #{currentBatch} • {batchSize} leads/batch</span>
              {autoContinue && <span className="text-primary animate-pulse">En cours...</span>}
            </div>
          </div>
        )}

        {/* Auto-continue toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-continue"
              checked={autoContinue}
              onCheckedChange={handleToggleAutoContinue}
              disabled={pendingCount === 0}
            />
            <Label htmlFor="auto-continue" className="cursor-pointer">
              Mode continu
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Score automatiquement jusqu'à arrêt manuel
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {autoContinue ? (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Arrêter
            </Button>
          ) : (
            <Button
              onClick={handleStartScoring}
              disabled={isScoring || pendingCount === 0}
              className="flex-1"
            >
              {isScoring ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Scorer {batchSize} leads
            </Button>
          )}
          
          {sessionScored > 0 && !autoContinue && (
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>

        {/* Batch size selector */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Taille du batch :</span>
          {[50, 100, 200].map((size) => (
            <button
              key={size}
              onClick={() => setBatchSize(size)}
              className={`px-2 py-1 rounded ${
                batchSize === size 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
              disabled={isScoring || autoContinue}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Estimation */}
        {pendingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Estimation : ~{Math.ceil(pendingCount / batchSize / 6)} min pour {pendingCount.toLocaleString('fr-FR')} leads
            ({Math.ceil(pendingCount / batchSize)} batches)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
