import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crosshair } from 'lucide-react';
import { CrossSignal } from '@/hooks/cockpit/useCockpitIntelligence';
import { cn } from '@/lib/utils';
import { entityRoute } from './helpers';
import { AIActionDrawer } from './AIActionDrawer';
import { computeAIActionSignature, type AIActionSnapshot } from '@/hooks/cockpit/useAIAction';

interface CrossSignalsWidgetProps {
  signals?: CrossSignal[];
  isLoading: boolean;
  navigate: (path: string) => void;
}

export function CrossSignalsWidget({ signals, isLoading, navigate }: CrossSignalsWidgetProps) {
  const [selected, setSelected] = useState<AIActionSnapshot | null>(null);

  if (isLoading || !signals?.length) return null;

  return (
    <>
      <Card className="border-violet-500/20">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5" /> Signaux Croisés
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{signals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <ScrollArea className="max-h-[280px] pr-2">
            <div className="space-y-1.5">
              {signals.map((signal, i) => {
              const snapshot: AIActionSnapshot = {
                signature: computeAIActionSignature({
                  source: 'cross_signal',
                  action_text: signal.signal,
                  entities: signal.entities,
                }),
                source: 'cross_signal',
                entity_type: signal.entities[0]?.type ?? null,
                entity_id: signal.entities[0]?.id ?? null,
                entity_name: signal.entities.map((e) => e.name).join(', '),
                action_text: signal.signal,
                urgency: signal.severity,
              };
              return (
                <div key={i}
                  className={cn(
                    "p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity",
                    signal.severity === 'high' ? 'bg-destructive/5 border-destructive/20' :
                    signal.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/50 border-border'
                  )}
                  onClick={() => setSelected(snapshot)}>
                  <p className="font-medium leading-snug">{signal.signal}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {signal.entities.map((e, j) => (
                      <button key={j}
                        className="text-[9px] bg-background/80 border rounded px-1 py-0 hover:bg-primary/10 transition-colors"
                        onClick={(ev) => { ev.stopPropagation(); navigate(entityRoute(e.type, e.id)); }}>
                        {e.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <AIActionDrawer snapshot={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
