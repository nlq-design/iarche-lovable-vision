import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";

interface MetricRow {
  workspace_id: string;
  cache_mode: string;
  day: string;
  total_calls: number;
  hits: number;
  misses: number;
  hit_rate_pct: number | null;
  avg_miss_latency_ms: number | null;
  p95_miss_latency_ms: number | null;
  total_cost_usd: number | null;
  estimated_savings_usd: number | null;
}

interface VoiceRow {
  user_id: string;
  workspace_id: string;
  day: string;
  seconds_transcribed: number;
  request_count: number;
  estimated_cost_usd: number;
}

export default function AIObservability() {
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [voice, setVoice] = useState<VoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const [m, v] = await Promise.all([
        supabase.from("ai_cache_metrics" as any).select("*").gte("day", since).order("day", { ascending: false }),
        supabase.from("voice_usage_daily").select("*").gte("day", since).order("day", { ascending: false }),
      ]);
      setMetrics((m.data as any) || []);
      setVoice((v.data as any) || []);
      setLoading(false);
    })();
  }, []);

  const totals = metrics.reduce(
    (acc, r) => {
      acc.calls += r.total_calls;
      acc.hits += r.hits;
      acc.cost += Number(r.total_cost_usd || 0);
      acc.savings += Number(r.estimated_savings_usd || 0);
      return acc;
    },
    { calls: 0, hits: 0, cost: 0, savings: 0 },
  );
  const globalHitRate = totals.calls > 0 ? Math.round((totals.hits / totals.calls) * 1000) / 10 : 0;

  const byMode = metrics.reduce<Record<string, { calls: number; hits: number; cost: number; p95: number }>>((acc, r) => {
    const m = r.cache_mode || "unknown";
    acc[m] = acc[m] || { calls: 0, hits: 0, cost: 0, p95: 0 };
    acc[m].calls += r.total_calls;
    acc[m].hits += r.hits;
    acc[m].cost += Number(r.total_cost_usd || 0);
    acc[m].p95 = Math.max(acc[m].p95, Number(r.p95_miss_latency_ms || 0));
    return acc;
  }, {});

  const voiceTotals = voice.reduce(
    (acc, r) => {
      acc.seconds += r.seconds_transcribed;
      acc.requests += r.request_count;
      acc.cost += Number(r.estimated_cost_usd || 0);
      return acc;
    },
    { seconds: 0, requests: 0, cost: 0 },
  );

  return (
    <>
      <Helmet>
        <title>Observabilité IA — Admin</title>
      </Helmet>
      <main className="min-h-screen bg-background p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Observabilité IA</h1>
          <p className="text-muted-foreground mt-1">Cache sémantique, coût LLM et usage vocal — 7 derniers jours</p>
        </header>

        {loading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Hit rate global</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{globalHitRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{totals.hits} hits / {totals.calls} appels</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Coût LLM 7j</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">${totals.cost.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Économies cache</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-emerald-600">${totals.savings.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Vocal — coût 7j</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">${voiceTotals.cost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{Math.round(voiceTotals.seconds / 60)} min · {voiceTotals.requests} requêtes</p>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Par mode</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Appels</th>
                        <th className="p-3">Hit rate</th>
                        <th className="p-3">Coût 7j</th>
                        <th className="p-3">p95 MISS</th>
                        <th className="p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byMode).map(([mode, v]) => {
                        const hr = v.calls > 0 ? Math.round((v.hits / v.calls) * 1000) / 10 : 0;
                        // Cibles différenciées par pipeline (IA-2)
                        const targetByMode: Record<string, number> = {
                          intelligence: 60,
                          public_rag: 60,           // FAQ marketing très répétitive
                          orchestrator_general: 25, // greetings + FAQ IArche
                          suggest_tasks: 40,
                          next_step: 40,
                        };
                        const target = targetByMode[mode] ?? 40;
                        return (
                          <tr key={mode} className="border-b last:border-0">
                            <td className="p-3 font-medium">{mode}</td>
                            <td className="p-3">{v.calls}</td>
                            <td className="p-3">{hr}%</td>
                            <td className="p-3">${v.cost.toFixed(3)}</td>
                            <td className="p-3">{v.p95 ? `${v.p95} ms` : "—"}</td>
                            <td className="p-3">
                              <Badge variant={hr >= target ? "default" : "secondary"}>
                                {hr >= target ? "OK" : `cible ≥ ${target}%`}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {Object.keys(byMode).length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucune donnée sur 7 jours.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Usage vocal par utilisateur</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="p-3">Utilisateur</th>
                        <th className="p-3">Jour</th>
                        <th className="p-3">Minutes</th>
                        <th className="p-3">Requêtes</th>
                        <th className="p-3">Coût</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voice.map((r) => (
                        <tr key={`${r.user_id}-${r.day}`} className="border-b last:border-0">
                          <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                          <td className="p-3">{r.day}</td>
                          <td className="p-3">{(r.seconds_transcribed / 60).toFixed(1)}</td>
                          <td className="p-3">{r.request_count}</td>
                          <td className="p-3">${Number(r.estimated_cost_usd).toFixed(4)}</td>
                        </tr>
                      ))}
                      {voice.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune dictée sur 7 jours.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
