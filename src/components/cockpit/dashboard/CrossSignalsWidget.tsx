import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crosshair, Network } from 'lucide-react';
import { CrossSignal, CrossSignalDB } from '@/hooks/cockpit/useCockpitIntelligence';
import { cn } from '@/lib/utils';
import { AIActionDrawer } from './AIActionDrawer';
import { EntityQuickViewDrawer } from './EntityQuickViewDrawer';
import { computeAIActionSignature, type AIActionSnapshot } from '@/hooks/cockpit/useAIAction';

interface CrossSignalsWidgetProps {
  signals?: CrossSignal[];
  embeddingSignals?: CrossSignalDB[];
  isLoading: boolean;
  navigate: (path: string) => void;
}

interface UnifiedSignal {
  title: string;
  body: string;
  severity: 'high' | 'medium' | 'low';
  entities: Array<{ type: string; id: string; name: string; role?: string }>;
  source: 'llm' | 'embedding';
  signal_type?: string;
}

export function CrossSignalsWidget({ signals, embeddingSignals, isLoading, navigate }: CrossSignalsWidgetProps) {
  const [selected, setSelected] = useState<AIActionSnapshot | null>(null);
  const [previewEntity, setPreviewEntity] = useState<{ type: string; id: string } | null>(null);

  const unified: UnifiedSignal[] = [
    ...(embeddingSignals || []).map((s) => ({
      title: s.title,
      body: s.narrative,
      severity: s.severity,
      entities: s.entities,
      source: 'embedding' as const,
      signal_type: s.signal_type,
    })),
    ...(signals || []).map((s) => ({
      title: s.signal,
      body: s.signal,
      severity: s.severity,
      entities: s.entities,
      source: 'llm' as const,
    })),
  ];

  if (isLoading || unified.length === 0) return null;

  return (
    <>
      <Card className="border-violet-500/20">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5" /> Signaux Croisés
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{unified.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-1.5">
              {unified.map((signal, i) => {
                const snapshot: AIActionSnapshot = {
                  signature: computeAIActionSignature({
                    source: 'cross_signal',
                    action_text: signal.title,
                    entities: signal.entities,
                  }),
                  source: 'cross_signal',
                  entity_type: signal.entities[0]?.type ?? null,
                  entity_id: signal.entities[0]?.id ?? null,
                  entity_name: signal.entities.map((e) => e.name).join(', '),
                  action_text: signal.body,
                  urgency: signal.severity,
                };
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity',
                      signal.severity === 'high'
                        ? 'bg-destructive/5 border-destructive/20'
                        : signal.severity === 'medium'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-muted/50 border-border',
                    )}
                    onClick={() => setSelected(snapshot)}
                  >
                    <div className="flex items-start gap-1.5">
                      {signal.source === 'embedding' && (
                        <Network className="h-3 w-3 mt-0.5 shrink-0 text-violet-500" aria-label="Détecté par embeddings" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug">{signal.title}</p>
                        {signal.source === 'embedding' && signal.body !== signal.title && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                            {signal.body}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {signal.entities.map((e, j) => (
                            <button
                              key={j}
                              className="text-[9px] bg-background/80 border rounded px-1 py-0 hover:bg-primary/10 transition-colors"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                navigate(entityRoute(e.type, e.id));
                              }}
                              title={e.role}
                            >
                              {e.name}
                              {e.role && <span className="opacity-60 ml-0.5">·{e.role}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
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
