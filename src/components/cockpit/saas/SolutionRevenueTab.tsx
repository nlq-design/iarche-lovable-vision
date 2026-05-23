import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { Euro, TrendingDown, Users } from "lucide-react";

interface Props { solutionId: string }

const fmtEur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

export function SolutionRevenueTab({ solutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["solution-revenue-detailed", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_revenue_detailed", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <LoadingState message="Chargement des revenus..." />;

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const activeCount = data?.active_count ?? 0;
  const churn = data?.churn_rate_30d ?? 0;
  const byPlan: any[] = data?.by_plan ?? [];
  const cohorts: any[] = data?.cohorts ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Euro className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-lg font-semibold">{fmtEur(mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Euro className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-lg font-semibold">{fmtEur(arr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Abonnés actifs</p>
              <p className="text-lg font-semibold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Churn 30j</p>
              <p className="text-lg font-semibold">{churn}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Répartition par plan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byPlan.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucun abonnement actif.</p>
            ) : byPlan.map((p: any) => (
              <div key={p.plan} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5 last:pb-0">
                <div>
                  <p className="font-medium">{p.plan || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.subscribers} abonnés</p>
                </div>
                <Badge variant="secondary">{fmtEur(p.mrr)} MRR</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Cohortes (12 mois)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Pas encore de cohortes.</p>
            ) : cohorts.map((c: any) => {
              const retention = c.new_subs > 0 ? Math.round((c.still_active / c.new_subs) * 100) : 0;
              return (
                <div key={c.cohort} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{c.cohort}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{c.new_subs} acquis</span>
                    <Badge variant={retention >= 70 ? "default" : "secondary"} className="text-xs">{retention}%</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
