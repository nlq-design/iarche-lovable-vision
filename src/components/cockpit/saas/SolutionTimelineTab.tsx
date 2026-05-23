import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { EmptyState } from "@/components/cockpit/common/EmptyState";
import { UserPlus, Briefcase, CreditCard, Activity, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { solutionId: string }

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  lead_linked: { label: "Prospect", icon: UserPlus, color: "text-blue-600" },
  opportunity_created: { label: "Opportunité", icon: Briefcase, color: "text-purple-600" },
  subscription_started: { label: "Abonnement", icon: CreditCard, color: "text-emerald-600" },
  trial_started: { label: "Essai", icon: Clock, color: "text-amber-600" },
  subscription_canceled: { label: "Annulation", icon: XCircle, color: "text-red-600" },
  activity: { label: "Activité IA", icon: Activity, color: "text-muted-foreground" },
};

export function SolutionTimelineTab({ solutionId }: Props) {
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["solution-timeline", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_timeline", { p_solution_id: solutionId, p_limit: 150 });
      if (error) throw error;
      return data as any;
    },
  });

  const events: any[] = data?.events ?? [];
  const filtered = useMemo(() => filter === "all" ? events : events.filter(e => e.type === filter), [events, filter]);

  if (isLoading) return <LoadingState message="Chargement de la timeline..." />;

  const types = Array.from(new Set(events.map(e => e.type)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("all")}>
          Tout ({events.length})
        </Button>
        {types.map(t => {
          const meta = TYPE_META[t] ?? { label: t };
          const count = events.filter(e => e.type === t).length;
          return (
            <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter(t)}>
              {meta.label} ({count})
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Aucun événement à afficher." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((ev, i) => {
                const meta = TYPE_META[ev.type] ?? { label: ev.type, icon: Activity, color: "text-muted-foreground" };
                const Icon = meta.icon;
                return (
                  <div key={i} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                    <div className={`mt-0.5 ${meta.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{ev.label}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{meta.label}</Badge>
                      </div>
                      {ev.entity_label && <div className="text-xs text-muted-foreground mt-0.5">{ev.entity_label}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true, locale: fr })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
