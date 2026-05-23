import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { Users, TrendingUp, Target, Megaphone } from "lucide-react";

interface Props { solutionId: string }

export function SolutionAcquisitionTab({ solutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["solution-acquisition", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_acquisition", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <LoadingState message="Chargement de l'acquisition..." />;

  const totalLeads = data?.total_leads ?? 0;
  const leads30d = data?.leads_30d ?? 0;
  const converted = data?.converted ?? 0;
  const activeCustomers = data?.active_customers ?? 0;
  const conversionRate = data?.conversion_rate ?? 0;
  const bySource: any[] = data?.by_source ?? [];
  const byCampaign: any[] = data?.by_campaign ?? [];
  const monthly: any[] = data?.monthly_trend ?? [];

  const maxMonthly = Math.max(...monthly.map((m: any) => m.leads || 0), 1);
  const maxSource = Math.max(...bySource.map((s: any) => s.leads || 0), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Leads total</p>
              <p className="text-lg font-semibold">{totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Leads 30j</p>
              <p className="text-lg font-semibold">{leads30d}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Target className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Taux conversion</p>
              <p className="text-lg font-semibold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Clients actifs</p>
              <p className="text-lg font-semibold">{activeCustomers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Sources d'acquisition</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucune source.</p>
            ) : bySource.map((s: any) => {
              const pct = Math.round((s.leads / maxSource) * 100);
              const qualPct = s.leads > 0 ? Math.round((s.qualified / s.leads) * 100) : 0;
              return (
                <div key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{s.source}</span>
                    <span className="text-xs text-muted-foreground">{s.leads} · {qualPct}% qualif.</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Campagnes UTM</CardTitle></CardHeader>
          <CardContent>
            {byCampaign.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucune campagne trackée (utm_campaign).</p>
            ) : (
              <div className="space-y-2">
                {byCampaign.map((c: any, i: number) => (
                  <div key={`${c.campaign}-${i}`} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.campaign}</p>
                      {c.medium && <p className="text-xs text-muted-foreground">{c.medium}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{c.leads}</Badge>
                      <Badge variant="outline" className="text-xs">{c.qualified} qual.</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border">
        <CardHeader className="pb-2"><CardTitle className="text-base">Évolution mensuelle (12 mois)</CardTitle></CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Pas encore de données.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {monthly.map((m: any) => {
                const pct = Math.round((m.leads / maxMonthly) * 100);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{m.leads}</div>
                    <div className="w-full bg-primary/70 rounded-t" style={{ height: `${pct}%` }} title={`${m.month}: ${m.leads}`} />
                    <div className="text-[10px] text-muted-foreground truncate w-full text-center">{m.month.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
