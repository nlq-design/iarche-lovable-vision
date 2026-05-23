import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { Rocket, Clock, TrendingUp } from "lucide-react";

interface Props { solutionId: string }

export function SolutionOnboardingTab({ solutionId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["solution-onboarding", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_onboarding", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <LoadingState message="Chargement du funnel..." />;

  const funnel: any[] = data?.funnel ?? [];
  const totalUsers = data?.total_users ?? 0;
  const activationRate = data?.activation_rate ?? 0;
  const avgDays = data?.avg_days_to_activation ?? 0;
  const maxCount = Math.max(...funnel.map((s: any) => s.count || 0), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Utilisateurs onboardés</p>
              <p className="text-xl font-semibold">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Taux d'activation</p>
              <p className="text-xl font-semibold">{activationRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Temps moyen d'activation</p>
              <p className="text-xl font-semibold">{avgDays} j</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funnel d'activation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée d'onboarding pour le moment.</p>
          ) : funnel.map((step: any, idx: number) => {
            const pct = totalUsers > 0 ? Math.round((step.count / maxCount) * 100) : 0;
            const conversionRate = totalUsers > 0 ? Math.round((step.count / totalUsers) * 100) : 0;
            return (
              <div key={step.step} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{idx + 1}. {step.label}</span>
                  <span className="text-muted-foreground">{step.count} ({conversionRate}%)</span>
                </div>
                <div className="h-6 bg-muted rounded overflow-hidden">
                  <div className="h-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
