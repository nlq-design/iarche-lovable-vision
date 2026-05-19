import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState, EmptyState } from '../common';

interface TemporalDeltas {
  available: boolean;
  reference_dates: { j1: string; j7: string; j30: string };
  current: Record<string, number>;
  j1: Record<string, number> | null;
  j7: Record<string, number> | null;
  j30: Record<string, number> | null;
}

interface Props {
  deltas?: TemporalDeltas | null;
  loading?: boolean;
}

const METRICS: Array<{ key: string; label: string; isMoney?: boolean; isPercent?: boolean }> = [
  { key: 'pipeline_value', label: 'Pipeline', isMoney: true },
  { key: 'weighted_value', label: 'Pondéré', isMoney: true },
  { key: 'leads_count', label: 'Leads actifs' },
  { key: 'opportunities_count', label: 'Opportunités' },
  { key: 'win_rate', label: 'Win rate', isPercent: true },
  { key: 'overdue_tasks_count', label: 'Tâches retard' },
];

function formatValue(v: number | undefined, isMoney = false, isPercent = false): string {
  if (v === undefined || v === null) return '—';
  if (isMoney) return `${Math.round(Number(v)).toLocaleString('fr-FR')} €`;
  if (isPercent) return `${Math.round(Number(v))}%`;
  return String(v);
}

function computeDelta(curr: number, prev: number | null | undefined): { pct: number | null; diff: number | null } {
  if (prev === undefined || prev === null) return { pct: null, diff: null };
  const p = Number(prev);
  const c = Number(curr);
  const diff = c - p;
  if (p === 0) return { pct: null, diff };
  return { pct: Math.round((diff / p) * 100), diff };
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[10px] text-muted-foreground">n/a</span>;
  const abs = Math.abs(pct);
  const isStable = abs < 5;
  const Icon = isStable ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  const colorClass = isStable
    ? 'text-muted-foreground'
    : pct > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

export function TrendDeltaWidget({ deltas, loading }: Props) {
  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState label="Calcul des tendances…" />
      </Card>
    );
  }

  if (!deltas || !deltas.available) {
    return (
      <Card className="p-4">
        <EmptyState
          title="Pas d'historique temporel"
          description="Les tendances J-1 / J-7 / J-30 seront disponibles dès le 2e snapshot quotidien."
        />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Tendances</h3>
        <span className="text-[10px] text-muted-foreground">J-1 / J-7 / J-30</span>
      </div>
      <div className="space-y-2">
        {METRICS.map((m) => {
          const curr = deltas.current?.[m.key];
          const dJ1 = computeDelta(curr, deltas.j1?.[m.key]);
          const dJ7 = computeDelta(curr, deltas.j7?.[m.key]);
          const dJ30 = computeDelta(curr, deltas.j30?.[m.key]);
          return (
            <div key={m.key} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                <p className="text-sm font-semibold truncate">{formatValue(curr, m.isMoney, m.isPercent)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-muted-foreground">J-1</span>
                  <DeltaBadge pct={dJ1.pct} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-muted-foreground">J-7</span>
                  <DeltaBadge pct={dJ7.pct} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-muted-foreground">J-30</span>
                  <DeltaBadge pct={dJ30.pct} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
