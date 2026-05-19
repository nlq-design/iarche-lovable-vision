import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface LogRow {
  id: string;
  tool_name: string | null;
  status: "ok" | "error";
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export function MCPHealthCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["mcp-request-logs"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [recent, last24h] = await Promise.all([
        supabase
          .from("mcp_request_logs")
          .select("id, tool_name, status, error_message, duration_ms, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("mcp_request_logs")
          .select("status, tool_name", { count: "exact" })
          .gte("created_at", since)
          .limit(1000),
      ]);
      if (recent.error) throw recent.error;
      if (last24h.error) throw last24h.error;
      return {
        recent: (recent.data || []) as LogRow[],
        window: (last24h.data || []) as Pick<LogRow, "status" | "tool_name">[],
      };
    },
    refetchInterval: 30_000,
  });

  const recent = data?.recent ?? [];
  const window24h = data?.window ?? [];
  const last = recent[0];
  const total24 = window24h.length;
  const errors24 = window24h.filter((r) => r.status === "error").length;
  const errorRate = total24 ? Math.round((errors24 / total24) * 100) : 0;

  const failingTools = Object.entries(
    window24h
      .filter((r) => r.status === "error" && r.tool_name)
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.tool_name as string] = (acc[r.tool_name as string] || 0) + 1;
        return acc;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Santé du connecteur MCP
        </CardTitle>
        <CardDescription>
          Statut de la dernière requête et indicateurs d'erreurs (fenêtre 24h, refresh 30s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Dernière requête</div>
                {last ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {last.status === "ok" ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Erreur
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(last.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <div className="text-sm font-mono truncate">{last.tool_name ?? "—"}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun appel enregistré</div>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Requêtes (24h)</div>
                <div className="text-2xl font-semibold">{total24}</div>
                <div className="text-xs text-muted-foreground">
                  {total24 - errors24} OK · {errors24} en erreur
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground mb-1">Taux d'erreur (24h)</div>
                <div
                  className={
                    "text-2xl font-semibold " +
                    (errorRate === 0
                      ? "text-emerald-600"
                      : errorRate < 10
                      ? "text-amber-600"
                      : "text-destructive")
                  }
                >
                  {errorRate}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {errorRate === 0
                    ? "Aucune anomalie"
                    : errorRate < 10
                    ? "Surveillance recommandée"
                    : "Action requise"}
                </div>
              </div>
            </div>

            {failingTools.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Outils en échec (24h)</div>
                <div className="space-y-1">
                  {failingTools.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <code className="text-xs">{name}</code>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">20 derniers appels</div>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun appel pour le moment.</p>
              ) : (
                <div className="rounded-lg border divide-y">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {r.status === "ok" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <code className="truncate">{r.tool_name ?? "—"}</code>
                        {r.status === "error" && r.error_message && (
                          <span className="text-muted-foreground truncate hidden md:inline">
                            — {r.error_message}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                        {r.duration_ms != null && <span>{r.duration_ms} ms</span>}
                        <span>
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
