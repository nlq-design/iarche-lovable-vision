/**
 * rag-content-gap-detector — Phase IA-2K
 *
 * Cron quotidien : exécute cluster_unanswered_rag (14j, ≥3 occurrences, sim ≥0.85)
 * et crée une alerte ai_sentinel_alerts (category='content_gap') par cluster détecté.
 *
 * Déduplication : ne recrée pas une alerte non résolue avec le même representative_query.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const WINDOW_DAYS = 14;
const MIN_COUNT = 3;
const SIM_THRESHOLD = 0.85;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: clusters, error } = await supabase.rpc("cluster_unanswered_rag", {
      _days: WINDOW_DAYS,
      _min_count: MIN_COUNT,
      _sim_threshold: SIM_THRESHOLD,
    });
    if (error) throw error;

    const found = clusters ?? [];
    let created = 0;
    let skipped = 0;

    for (const c of found) {
      // Dédupe : alerte non résolue avec ce même representative_query déjà ouverte ?
      const { data: existing } = await supabase
        .from("ai_sentinel_alerts")
        .select("id")
        .eq("workspace_id", PUBLIC_WORKSPACE_ID)
        .eq("category", "content_gap")
        .is("resolved_at", null)
        .filter("ai_metadata->>representative_query", "eq", c.representative_query)
        .maybeSingle();

      if (existing?.id) {
        skipped++;
        continue;
      }

      const severity = c.occurrences >= 10 ? "high" : c.occurrences >= 5 ? "medium" : "low";

      const { error: insErr } = await supabase.from("ai_sentinel_alerts").insert({
        workspace_id: PUBLIC_WORKSPACE_ID,
        severity,
        category: "content_gap",
        title: `Lacune contenu public : "${String(c.representative_query).slice(0, 80)}"`,
        description: `${c.occurrences} questions similaires sans réponse satisfaisante sur ${WINDOW_DAYS} jours (similarité moyenne ${Number(c.avg_top_similarity ?? 0).toFixed(2)}). Exemples : ${(c.sample_queries ?? []).slice(0, 3).map((q: string) => `« ${q} »`).join(" · ")}. Créer un article ou une FAQ pour combler ce manque.`,
        entity_type: "content_gap",
        ai_metadata: {
          representative_query: c.representative_query,
          occurrences: c.occurrences,
          last_asked: c.last_asked,
          avg_top_similarity: c.avg_top_similarity,
          sample_queries: c.sample_queries,
          window_days: WINDOW_DAYS,
          source: "rag-content-gap-detector",
        },
      });

      if (insErr) {
        console.error("[rag-content-gap-detector] insert error:", insErr.message);
      } else {
        created++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clusters_found: found.length,
      alerts_created: created,
      alerts_skipped: skipped,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rag-content-gap-detector]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
