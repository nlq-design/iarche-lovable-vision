import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crosshair } from 'lucide-react';
import { CrossSignal } from '@/hooks/cockpit/useCockpitIntelligence';
import { cn } from '@/lib/utils';
import { entityRoute } from './helpers';

interface CrossSignalsWidgetProps {
  signals?: CrossSignal[];
  isLoading: boolean;
  navigate: (path: string) => void;
}

export function CrossSignalsWidget({ signals, isLoading, navigate }: CrossSignalsWidgetProps) {
  if (isLoading || !signals?.length) return null;

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5" /> Signaux Croisés
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-1.5">
          {signals.slice(0, 4).map((signal, i) => (
            <div key={i} className={cn(
              "p-2 rounded-lg border text-xs",
              signal.severity === 'high' ? 'bg-destructive/5 border-destructive/20' :
              signal.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/50 border-border'
            )}>
              <p className="font-medium leading-snug">{signal.signal}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {signal.entities.map((e, j) => (
                  <button key={j}
                    className="text-[9px] bg-background/80 border rounded px-1 py-0 hover:bg-primary/10 transition-colors"
                    onClick={() => navigate(entityRoute(e.type, e.id))}>
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
