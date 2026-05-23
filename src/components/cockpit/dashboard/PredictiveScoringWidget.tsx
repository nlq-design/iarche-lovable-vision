import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadPredictions, type LeadPredictiveAlert } from '@/hooks/cockpit/useLeadPredictions';
import { LoadingState } from '@/components/cockpit/common/LoadingState';

interface PredictiveScoringWidgetProps {
  workspaceId?: string;
  navigate: (path: string) => void;
}

/**
 * Phase H — Widget scoring prédictif quantitatif (heuristique DB, zéro LLM).
 * Complémentaire de PredictionsWidget (LLM, qualitatif).
 */
export function PredictiveScoringWidget({ workspaceId, navigate }: PredictiveScoringWidgetProps) {
  const { data: alerts, isLoading } = useLeadPredictions(workspaceId);

  if (isLoading) {
    return (
      <Card className="border-amber-500/20">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Scoring 14j
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-2">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (!alerts?.length) return null;

  const churn = alerts.filter((a) => a.alert_type === 'churn');
  const conversion = alerts.filter((a) => a.alert_type === 'conversion');

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Scoring 14j
          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <ScrollArea className="h-[280px] pr-2">
          <div className="space-y-1.5">
            {churn.map((a) => (
              <AlertRow key={a.id} alert={a} navigate={navigate} />
            ))}
            {conversion.map((a) => (
              <AlertRow key={a.id} alert={a} navigate={navigate} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AlertRow({
  alert,
  navigate,
}: {
  alert: LeadPredictiveAlert;
  navigate: (path: string) => void;
}) {
  const isChurn = alert.alert_type === 'churn';
  const Icon = isChurn ? TrendingDown : TrendingUp;
  const colorClass = isChurn
    ? 'bg-destructive/5 border-destructive/20'
    : 'bg-emerald-500/5 border-emerald-500/20';
  const iconColor = isChurn ? 'text-destructive' : 'text-emerald-500';
  const label = isChurn ? 'Risque churn' : 'Probabilité conv.';

  const signals = alert.signals as Record<string, number | string> | undefined;
  const daysInactive = signals?.days_inactive as number | undefined;
  const activity7d = signals?.activity_7d as number | undefined;

  return (
    <button
      type="button"
      onClick={() => navigate(`/cockpit/consulte/${alert.lead_id}`)}
      className={cn(
        'w-full text-left p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity',
        colorClass
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug truncate">
            {alert.name || 'Lead'}
            {alert.company ? ` — ${alert.company}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={alert.score} className="h-1 flex-1" />
            <span className="text-[9px] text-muted-foreground tabular-nums">{alert.score}%</span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {label}
            {typeof daysInactive === 'number' && ` · ${Math.round(daysInactive)}j inactif`}
            {typeof activity7d === 'number' && ` · ${activity7d} act./7j`}
          </div>
        </div>
      </div>
    </button>
  );
}
