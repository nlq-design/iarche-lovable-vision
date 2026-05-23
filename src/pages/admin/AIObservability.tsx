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

interface ContentGapRow {
  cluster_anchor_id: string;
  representative_query: string;
  occurrences: number;
  last_asked: string;
  avg_top_similarity: number | null;
  sample_queries: string[] | null;
}

interface ContentGapAlertRow {
  id: string;
  severity: string;
  title: string;
  created_at: string;
  resolved_at: string | null;
  ai_metadata: Record<string, unknown> | null;
}

interface ThresholdRow {
  workspace_id: string;
  auto_action_confidence_threshold: number;
  rag_similarity_threshold: number;
  last_metrics: Record<string, unknown> | null;
  updated_at: string;
}

export default function AIObservability() {
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [voice, setVoice] = useState<VoiceRow[]>([]);
  const [gaps, setGaps] = useState<ContentGapRow[]>([]);
  const [gapAlerts, setGapAlerts] = useState<ContentGapAlertRow[]>([]);
  const [autoResolved, setAutoResolved] = useState<ContentGapAlertRow[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [m, v, g, ga, ar, th] = await Promise.all([
        supabase.from("ai_cache_metrics" as any).select("*").gte("day", since).order("day", { ascending: false }),
        supabase.from("voice_usage_daily").select("*").gte("day", since).order("day", { ascending: false }),
        supabase.rpc("cluster_unanswered_rag" as any, { _days: 14, _min_count: 2, _sim_threshold: 0.85 }),
        supabase.from("ai_sentinel_alerts" as any)
          .select("id, severity, title, created_at, resolved_at, ai_metadata")
          .eq("category", "content_gap")
          .is("resolved_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("ai_sentinel_alerts" as any)
          .select("id, severity, title, created_at, resolved_at, ai_metadata")
          .eq("category", "content_gap")
          .not("resolved_at", "is", null)
          .gte("resolved_at", sinceIso)
          .order("resolved_at", { ascending: false })
          .limit(10),
        supabase.from("workspace_ai_thresholds" as any)
          .select("*")
          .order("updated_at", { ascending: false }),
      ]);
      setMetrics((m.data as any) || []);
      setVoice((v.data as any) || []);
      setGaps((g.data as any) || []);
      setGapAlerts((ga.data as any) || []);
      setAutoResolved((ar.data as any) || []);
      setThresholds((th.data as any) || []);
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

            <section>
              <h2 className="text-xl font-semibold mb-3">Lacunes contenu public (RAG)</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Questions récurrentes sans réponse satisfaisante sur 14 jours (clustering sémantique cosine ≥ 0.85). À transformer en articles/FAQ.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Alertes Sentinelle ouvertes ({gapAlerts.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {gapAlerts.map((a) => {
                        const meta = (a.ai_metadata ?? {}) as Record<string, unknown>;
                        const occ = (meta.occurrences as number) ?? 0;
                        return (
                          <li key={a.id} className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant={a.severity === "high" ? "destructive" : a.severity === "medium" ? "default" : "secondary"} className="text-[10px]">
                                {a.severity}
                              </Badge>
                              <span className="font-medium truncate flex-1">{a.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{occ}×</span>
                            </div>
                          </li>
                        );
                      })}
                      {gapAlerts.length === 0 && (
                        <li className="p-6 text-center text-muted-foreground text-sm">Aucune alerte ouverte.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top clusters live (≥ 2 occurrences)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {gaps.slice(0, 10).map((c) => (
                        <li key={c.cluster_anchor_id} className="p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0">{c.occurrences}×</Badge>
                            <span className="flex-1 truncate">« {c.representative_query} »</span>
                          </div>
                          {c.sample_queries && c.sample_queries.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-1 ml-8 truncate">
                              + {c.sample_queries.length - 1} variantes
                            </p>
                          )}
                        </li>
                      ))}
                      {gaps.length === 0 && (
                        <li className="p-6 text-center text-muted-foreground text-sm">Aucun cluster détecté.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Lacunes auto-résolues (30 j)</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Alertes fermées automatiquement par <code>auto_resolve_content_gaps</code> lorsqu'un contenu public couvre la question (similarité ≥ 0,80, zéro coût LLM).
              </p>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {autoResolved.map((a) => {
                      const meta = (a.ai_metadata ?? {}) as Record<string, any>;
                      const match = meta.resolution_match as Record<string, any> | undefined;
                      return (
                        <li key={a.id} className="p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">auto</Badge>
                            <span className="font-medium truncate flex-1">{a.title}</span>
                            {match?.similarity && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                sim {Number(match.similarity).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {match?.title && (
                            <p className="text-xs text-muted-foreground mt-1 ml-1 truncate">
                              → couvert par : « {String(match.title)} »
                            </p>
                          )}
                        </li>
                      );
                    })}
                    {autoResolved.length === 0 && (
                      <li className="p-6 text-center text-muted-foreground text-sm">Aucune lacune auto-résolue récemment.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Seuils IA adaptatifs par espace</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Recalculés chaque lundi 03:00 UTC selon le taux d'annulation des auto-actions sur 30 jours (plage 0,75–0,95).
              </p>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="p-3">Espace</th>
                        <th className="p-3">Seuil auto-action</th>
                        <th className="p-3">Seuil RAG</th>
                        <th className="p-3">Taux annulation</th>
                        <th className="p-3">Échantillon</th>
                        <th className="p-3">Mis à jour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thresholds.map((t) => {
                        const lm = (t.last_metrics ?? {}) as Record<string, any>;
                        const cr = typeof lm.cancel_rate === "number" ? lm.cancel_rate : null;
                        return (
                          <tr key={t.workspace_id} className="border-b last:border-0">
                            <td className="p-3 font-mono text-xs">{t.workspace_id.slice(0, 8)}…</td>
                            <td className="p-3 font-medium">{Number(t.auto_action_confidence_threshold).toFixed(2)}</td>
                            <td className="p-3">{Number(t.rag_similarity_threshold).toFixed(2)}</td>
                            <td className="p-3">{cr !== null ? `${(cr * 100).toFixed(1)} %` : "—"}</td>
                            <td className="p-3">{(lm.sample_size as number) ?? "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                      {thresholds.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun seuil personnalisé (valeurs par défaut appliquées).</td></tr>
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

    </>
  );
}
