import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [batchSize, setBatchSize] = useState(100);
  const queryClient = useQueryClient();

  const handleStartScoring = async () => {
    if (pendingCount === 0) {
      toast.info('Aucun lead à scorer');
      return;
    }

    setIsScoring(true);
    setProgress(0);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('score-viviers-batch', {
        body: { batch_size: batchSize },
      });

      if (error) throw error;

      setResult(data as ScoringResult);
      setProgress(100);

      if (data.scored > 0) {
        toast.success(`${data.scored} leads scorés avec succès`);
        queryClient.invalidateQueries({ queryKey: ['viviers'] });
        queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
        onComplete?.();
      } else if (data.errors > 0) {
        toast.warning(`Scoring terminé avec ${data.errors} erreurs`);
      }
    } catch (err) {
      console.error('Scoring error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur de scoring');
    } finally {
      setIsScoring(false);
    }
  };

  const handleScoreAll = async () => {
    if (pendingCount === 0) {
      toast.info('Aucun lead à scorer');
      return;
    }

    const confirmed = window.confirm(
      `Vous êtes sur le point de scorer ${pendingCount.toLocaleString('fr-FR')} leads. Cette opération peut prendre plusieurs minutes. Continuer ?`
    );

    if (!confirmed) return;

    setIsScoring(true);
    setProgress(0);
    setResult(null);

    let totalScored = 0;
    let totalErrors = 0;
    const batchesToProcess = Math.ceil(pendingCount / batchSize);

    try {
      for (let i = 0; i < batchesToProcess; i++) {
        const { data, error } = await supabase.functions.invoke('score-viviers-batch', {
          body: { batch_size: batchSize },
        });

        if (error) {
          console.error(`Batch ${i + 1} error:`, error);
          totalErrors += batchSize;
        } else {
          totalScored += data.scored || 0;
          totalErrors += data.errors || 0;
        }

        setProgress(Math.round(((i + 1) / batchesToProcess) * 100));

        // Reduced delay between batches
        if (i < batchesToProcess - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setResult({
        success: true,
        batch_id: 'all',
        scored: totalScored,
        errors: totalErrors,
        details: [],
      });

      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      
      toast.success(`Scoring terminé : ${totalScored} scorés, ${totalErrors} erreurs`);
      onComplete?.();
    } catch (err) {
      console.error('Full scoring error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur de scoring');
    } finally {
      setIsScoring(false);
    }
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

        {/* Progress */}
        {isScoring && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {result.errors === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : result.scored > result.errors ? (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {result.scored} scorés, {result.errors} erreurs
              </p>
              <p className="text-xs text-muted-foreground">
                Batch ID: {result.batch_id.slice(0, 8)}...
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
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
          
          {pendingCount > batchSize && (
            <Button
              variant="outline"
              onClick={handleScoreAll}
              disabled={isScoring || pendingCount === 0}
            >
              Tout scorer
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
              disabled={isScoring}
            >
              {size}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
