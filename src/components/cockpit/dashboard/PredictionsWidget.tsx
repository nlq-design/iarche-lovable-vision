import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { Prediction } from '@/hooks/cockpit/useCockpitIntelligence';
import { cn } from '@/lib/utils';
import { AIActionDrawer } from './AIActionDrawer';
import { computeAIActionSignature, type AIActionSnapshot } from '@/hooks/cockpit/useAIAction';

interface PredictionsWidgetProps {
  predictions?: Prediction[];
  isLoading: boolean;
  navigate: (path: string) => void;
}

export function PredictionsWidget({ predictions, isLoading }: PredictionsWidgetProps) {
  const [selected, setSelected] = useState<AIActionSnapshot | null>(null);
  if (isLoading || !predictions?.length) return null;

  return (
    <>
      <Card className="border-cyan-500/20">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Prédictions 7j
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{predictions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <ScrollArea className="max-h-[280px] pr-2">
            <div className="space-y-1.5">
              {predictions.map((pred, i) => {
              const snapshot: AIActionSnapshot = {
                signature: computeAIActionSignature({
                  source: 'prediction',
                  entity_type: pred.entities[0]?.type,
                  entity_id: pred.entities[0]?.id,
                  action_text: pred.prediction,
                }),
                source: 'prediction',
                entity_type: pred.entities[0]?.type ?? null,
                entity_id: pred.entities[0]?.id ?? null,
                entity_name: pred.entities.map((e) => e.name).join(', '),
                action_text: pred.prediction,
                urgency: pred.risk_type === 'risk' ? 'high' : 'medium',
              };
              return (
                <div key={i}
                  className={cn(
                    "p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity",
                    pred.risk_type === 'risk' ? 'bg-destructive/5 border-destructive/20' : 'bg-emerald-500/5 border-emerald-500/20'
                  )}
                  onClick={() => setSelected(snapshot)}>
                  <div className="flex items-start gap-2">
                    {pred.risk_type === 'risk' ?
                      <TrendingDown className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" /> :
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{pred.prediction}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={pred.confidence * 100} className="h-1 flex-1" />
                        <span className="text-[9px] text-muted-foreground">{Math.round(pred.confidence * 100)}%</span>
                        <span className="text-[9px] text-muted-foreground">{pred.timeframe}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <AIActionDrawer snapshot={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}

