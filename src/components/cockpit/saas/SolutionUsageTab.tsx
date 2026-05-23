import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { EmptyState } from "@/components/cockpit/common/EmptyState";
import { Activity, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { solutionId: string }

export function SolutionUsageTab({ solutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["solution-user-activity", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_user_activity", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <LoadingState message="Calcul de l'engagement utilisateurs..." />;

  const workspaces: any[] = data?.workspaces ?? [];
  const alerts = workspaces.filter(w => w.inactive_alert);

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-600" : s >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium">{alerts.length} workspace(s)</span>
            <span className="text-muted-foreground">inactifs depuis plus de 14 jours — risque de churn</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Engagement par workspace ({workspaces.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <EmptyState message="Aucun workspace abonné actif pour cette solution." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Workspace</th>
                    <th className="text-left">Plan</th>
                    <th className="text-right">DAU</th>
                    <th className="text-right">WAU</th>
                    <th className="text-right">MAU</th>
                    <th className="text-right">Tokens IA 30j</th>
                    <th className="text-left">Dernière activité</th>
                    <th className="text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => (
                    <tr key={w.workspace_id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="font-medium">{w.workspace_name}</div>
                        {w.top_features?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {w.top_features.slice(0,3).map((f: any) => (
                              <Badge key={f.feature} variant="outline" className="text-[10px] h-4 px-1">
                                {f.feature} · {f.count}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge variant={w.subscription_status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {w.plan_name}
                        </Badge>
                      </td>
                      <td className="text-right">{w.dau_count}</td>
                      <td className="text-right">{w.wau_count}</td>
                      <td className="text-right">{w.mau_count}</td>
                      <td className="text-right tabular-nums">{Number(w.ai_tokens_30d).toLocaleString("fr-FR")}</td>
                      <td className="text-xs">
                        {w.last_activity_at
                          ? formatDistanceToNow(new Date(w.last_activity_at), { addSuffix: true, locale: fr })
                          : <span className="text-muted-foreground">jamais</span>}
                      </td>
                      <td className={`text-right font-semibold ${scoreColor(w.engagement_score)}`}>{w.engagement_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
