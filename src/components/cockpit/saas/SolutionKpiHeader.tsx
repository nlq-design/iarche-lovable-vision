import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Euro, Users, Activity, AlertTriangle } from "lucide-react";

interface Props { solutionId: string }

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

/**
 * Bandeau KPIs synthétiques affiché en haut de la page détail d'une solution.
 * Agrège revenus + acquisition + usage + support en une vue de tête.
 */
export function SolutionKpiHeader({ solutionId }: Props) {
  const { data: rev } = useQuery({
    queryKey: ["solution-revenue-detailed", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_revenue_detailed", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: acq } = useQuery({
    queryKey: ["solution-acquisition", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_acquisition", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: support } = useQuery({
    queryKey: ["solution-support", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_support", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  const items = [
    { label: "MRR", value: fmtEur(rev?.mrr ?? 0), sub: `${rev?.active_count ?? 0} actifs`, icon: Euro },
    { label: "Leads 30j", value: acq?.leads_30d ?? 0, sub: `${acq?.conversion_rate ?? 0}% conv.`, icon: Users },
    { label: "Tickets ouverts", value: support?.tickets?.open ?? 0, sub: support?.tickets?.urgent_open ? `${support.tickets.urgent_open} urgents` : "—", icon: AlertTriangle },
    { label: "NPS 90j", value: support?.nps?.score ?? "—", sub: `${support?.nps?.responses ?? 0} réponses`, icon: Activity },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map(({ label, value, sub, icon: Icon }) => (
        <Card key={label} className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none mb-1">{label}</p>
              <p className="text-lg font-semibold leading-none">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
