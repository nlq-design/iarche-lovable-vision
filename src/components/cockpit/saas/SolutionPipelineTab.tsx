import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { EmptyState } from "@/components/cockpit/common/EmptyState";
import { TrendingUp, Target, Trophy, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { solutionId: string }

const STAGE_LABELS: Record<string, string> = {
  discovery: "Découverte",
  qualification: "Qualification",
  proposal: "Proposition",
  negotiation: "Négociation",
  closed_won: "Gagnée",
  closed_lost: "Perdue",
};

export function SolutionPipelineTab({ solutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["solution-pipeline", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_pipeline", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <LoadingState message="Chargement du pipeline..." />;

  const kpis = data?.kpis ?? {};
  const stages: any[] = data?.stages ?? [];
  const opps: any[] = data?.opportunities ?? [];

  const fmtEur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Pipeline ouvert" value={fmtEur(kpis.pipeline_value_eur)} sub={`${kpis.open_count ?? 0} opportunités`} />
        <KpiCard icon={<Target className="h-4 w-4" />} label="Pipeline pondéré" value={fmtEur(kpis.weighted_pipeline_eur)} sub="x probabilité" />
        <KpiCard icon={<Trophy className="h-4 w-4" />} label="Gagnées" value={fmtEur(kpis.won_value_eur)} sub={`${kpis.won_count ?? 0} deals`} />
        <KpiCard icon={<XCircle className="h-4 w-4" />} label="Win rate" value={`${kpis.win_rate ?? 0}%`} sub={`${kpis.lost_count ?? 0} perdues`} />
      </div>

      {/* Funnel par stage */}
      {stages.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Répartition par étape</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stages.map((s) => {
                const max = Math.max(...stages.map(x => Number(x.value_eur) || 1));
                const pct = max > 0 ? (Number(s.value_eur) / max) * 100 : 0;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-muted-foreground">{STAGE_LABELS[s.stage] ?? s.stage}</div>
                    <div className="flex-1 bg-muted rounded h-6 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/60" style={{ width: `${pct}%` }} />
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
                        <span className="font-medium">{s.count}</span>
                        <span>{fmtEur(Number(s.value_eur))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table opportunités */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Opportunités ({opps.length})</CardTitle></CardHeader>
        <CardContent>
          {opps.length === 0 ? (
            <EmptyState message="Aucune opportunité liée à cette solution. Les nouvelles opportunités créées depuis un prospect lié s'attacheront automatiquement." />
          ) : (
            <div className="space-y-2">
              {opps.map((o) => (
                <div key={o.id} className="border rounded p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{o.title}</span>
                        <Badge variant="secondary" className="text-xs">{STAGE_LABELS[o.stage] ?? o.stage}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.lead_name && <span>{o.lead_name}</span>}
                        {o.lead_company && <span> · {o.lead_company}</span>}
                        {o.expected_close_date && <span> · closing {format(new Date(o.expected_close_date), "dd MMM yyyy", { locale: fr })}</span>}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{fmtEur(Number(o.value_amount) || 0)}</div>
                      <div className="text-xs text-muted-foreground">{o.probability ?? 50}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
        <div className="text-lg font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
