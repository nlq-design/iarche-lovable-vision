import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Play, Loader2, CheckCircle, XCircle, AlertTriangle, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const [totalScored, setTotalScored] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [batchSize, setBatchSize] = useState(100);
  const [currentBatch, setCurrentBatch] = useState(0);
  const stopRef = useRef(false);
  const queryClient = useQueryClient();

  // Initial count when auto-continue started
  const initialPendingRef = useRef(0);

  const progress = initialPendingRef.current > 0 
    ? Math.round(((initialPendingRef.current - pendingCount + totalScored) / initialPendingRef.current) * 100)
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
      setTotalScored(prev => prev + result.scored);
      setTotalErrors(prev => prev + result.errors);

      if (result.scored > 0) {
        toast.success(`Batch ${currentBatch + 1}: ${result.scored} leads scorés`);
        queryClient.invalidateQueries({ queryKey: ['viviers'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-scoring-stats'] });
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
      initialPendingRef.current = pendingCount;
      setTotalScored(0);
      setTotalErrors(0);
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
    setTotalScored(0);
    setTotalErrors(0);
    setCurrentBatch(0);
    initialPendingRef.current = 0;
  };

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
        {/* Stats */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Leads en attente de scoring</p>
            <p className="text-2xl font-bold">{pendingCount.toLocaleString('fr-FR')}</p>
          </div>
          <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
            {pendingCount > 0 ? 'À scorer' : 'Tous scorés'}
          </Badge>
        </div>

        {/* Progress - show when auto-continue is on or has scored */}
        {(autoContinue || totalScored > 0) && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Session: {totalScored.toLocaleString('fr-FR')} scorés
                {totalErrors > 0 && <span className="text-destructive ml-2">({totalErrors} erreurs)</span>}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Batch #{currentBatch} • {batchSize} leads/batch
            </p>
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
          
          {totalScored > 0 && !autoContinue && (
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
            Estimation : ~{Math.ceil(pendingCount / batchSize / 60)} min pour {pendingCount.toLocaleString('fr-FR')} leads
            ({Math.ceil(pendingCount / batchSize)} batches)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
