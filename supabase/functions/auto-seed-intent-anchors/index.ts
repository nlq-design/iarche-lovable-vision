// Phase F — Auto-apprentissage des ancres d'intent
// Analyse les fallbacks LLM récurrents (table ai_intent_router_fallbacks)
// et insère les requêtes récurrentes comme nouvelles ancres dans ai_intent_anchors.
// Idempotent : skip si déjà existante (contrainte unique intent+text).
// Déployée en daily cron — voir migration pour la planification.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_INTENTS = new Set(["crm_query", "doc_generation", "analysis", "vivier", "general"]);
const MIN_OCCURRENCES = 3;       // requête répétée ≥3 fois
const SINCE_DAYS = 7;            // sur les 7 derniers jours
const MAX_NEW_ANCHORS = 25;      // borne par exécution
const MAX_AVG_SIMILARITY = 0.70; // ignore les "presque-hits" déjà couverts par d'autres ancres

async function embed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: text,
        dimensions: 1536,
      }),
    });
    if (!resp.ok) {
      console.warn(`[auto-seed] embed ${resp.status}: ${await resp.text()}`);
      return null;
    }
    const json = await resp.json();
    return json.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.warn(`[auto-seed] embed failed: ${(e as Error).message}`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: recurring, error: rpcErr } = await supabase.rpc("get_recurring_intent_fallbacks", {
    min_count: MIN_OCCURRENCES,
    since_days: SINCE_DAYS,
    max_results: MAX_NEW_ANCHORS * 2,
  });

  if (rpcErr) {
    console.error("[auto-seed] RPC error:", rpcErr);
    return new Response(JSON.stringify({ error: rpcErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let added = 0;
  let skipped = 0;
  let rejected = 0;
  const samples: Array<{ intent: string; text: string; occ: number }> = [];

  for (const row of (recurring || []) as Array<{
    query_normalized: string;
    intent_classified: string;
    occurrences: number;
    example_query: string;
    avg_similarity: number | null;
  }>) {
    if (added >= MAX_NEW_ANCHORS) break;
    const intent = row.intent_classified;
    const text = (row.example_query || row.query_normalized).trim();
    if (!VALID_INTENTS.has(intent) || !text || text.length < 4) { rejected++; continue; }
    // Si avg_similarity déjà élevée → l'ancre proche existe sans doute, on évite le bruit
    if (row.avg_similarity !== null && row.avg_similarity > MAX_AVG_SIMILARITY) { rejected++; continue; }

    // Skip si exact déjà présent
    const { data: existing } = await supabase
      .from("ai_intent_anchors")
      .select("id")
      .eq("intent", intent)
      .eq("text", text)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    const vec = await embed(text, apiKey);
    if (!vec) { rejected++; continue; }

    const { error: insErr } = await supabase
      .from("ai_intent_anchors")
      .insert({ intent, text, embedding: `[${vec.join(",")}]` });
    if (insErr) {
      console.warn(`[auto-seed] insert failed: ${insErr.message}`);
      rejected++;
      continue;
    }
    added++;
    samples.push({ intent, text, occ: Number(row.occurrences) });
    await new Promise((r) => setTimeout(r, 150));
  }

  // Nettoyage : on conserve 30j max d'historique de fallbacks
  await supabase
    .from("ai_intent_router_fallbacks")
    .delete()
    .lt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  console.log(`[auto-seed] added=${added} skipped=${skipped} rejected=${rejected}`);

  return new Response(
    JSON.stringify({ added, skipped, rejected, samples, candidates: recurring?.length || 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
