// Phase G — Cache Prewarming Intelligent
// Pré-classifie une liste de requêtes dashboard fréquentes pour peupler
// ai_query_intent_cache. Throttle 6h par workspace via ai_prewarm_runs.
// Zéro LLM si toutes les requêtes sont déjà cachées → coût négligeable.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THROTTLE_HOURS = 6;
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const CLASSIFIER_MODEL = "google/gemini-2.5-flash-lite";
const SEMANTIC_THRESHOLD = 0.75;

// 20 requêtes dashboard les plus fréquentes (curées d'après usage Cockpit)
const PREWARM_QUERIES: string[] = [
  // CRM query
  "mes leads chauds cette semaine",
  "score BANT de mes opportunités",
  "quels sont mes 5 prochains rendez-vous",
  "liste des opportunités en cours",
  "leads non contactés depuis 7 jours",
  // Analysis
  "analyse de mon pipeline commercial",
  "synthèse de la semaine",
  "audit qualité CRM",
  "que penses-tu de mon top 3 opportunités",
  // Doc generation
  "rédige un email de relance générique",
  "génère un devis type",
  "prépare une proposition commerciale",
  // Vivier
  "stats du vivier biotech",
  "campagnes Instantly en cours",
  // General
  "bonjour",
  "que peux-tu faire",
  "aide",
  "résume ma journée",
  "quel est mon prochain objectif commercial",
  "rappelle-moi ma stratégie",
];

async function embed(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 500), dimensions: 1536 }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function classifyLlm(text: string, apiKey: string): Promise<string> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: "Classe en un seul mot parmi: crm_query, doc_generation, analysis, vivier, general. Si doute → general." },
          { role: "user", content: text.slice(0, 500) },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    if (!r.ok) return "general";
    const j = await r.json();
    const raw = (j?.choices?.[0]?.message?.content || "").toLowerCase().trim();
    return (["crm_query", "doc_generation", "analysis", "vivier", "general"]
      .find((i) => raw.includes(i))) || "general";
  } catch {
    return "general";
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

  // Validate JWT + resolve workspace
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supaUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes } = await supaUser.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let workspaceId: string | null = null;
  try {
    const { data } = await supa.rpc("resolve_workspace_for_user", { p_user_id: user.id });
    workspaceId = (Array.isArray(data) ? data[0]?.workspace_id : data) ?? null;
  } catch {
    // fallback: lookup via members
    const { data } = await supa.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  }
  if (!workspaceId) {
    return new Response(JSON.stringify({ skipped: true, reason: "no_workspace" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Throttle
  const { data: lastRun } = await supa
    .from("ai_prewarm_runs")
    .select("last_run_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (lastRun?.last_run_at) {
    const ageHours = (Date.now() - new Date(lastRun.last_run_at).getTime()) / 3_600_000;
    if (ageHours < THROTTLE_HOURS) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: "throttled",
        next_run_in_hours: Number((THROTTLE_HOURS - ageHours).toFixed(2)),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  let cacheHits = 0;
  let llmCalls = 0;
  let semanticHits = 0;

  for (const q of PREWARM_QUERIES) {
    const normalized = q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
    // 1. Already in persistent cache ?
    const { data: existing } = await supa
      .from("ai_query_intent_cache")
      .select("query_normalized")
      .eq("query_normalized", normalized)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (existing) { cacheHits++; continue; }

    // 2. Try semantic match
    const vec = await embed(q, apiKey);
    let intent = "general";
    let similarity: number | null = null;
    let source: "semantic" | "llm" = "llm";

    if (vec) {
      const { data: match } = await supa.rpc("match_intent_anchor", {
        query_embedding_text: `[${vec.join(",")}]`,
        similarity_threshold: 0,
      });
      const top = match?.[0];
      if (top && Number(top.similarity) >= SEMANTIC_THRESHOLD) {
        intent = top.intent;
        similarity = Number(top.similarity);
        source = "semantic";
        semanticHits++;
      } else {
        similarity = top ? Number(top.similarity) : null;
        intent = await classifyLlm(q, apiKey);
        llmCalls++;
      }
    } else {
      intent = await classifyLlm(q, apiKey);
      llmCalls++;
    }

    await supa.from("ai_query_intent_cache").upsert({
      query_normalized: normalized,
      intent,
      similarity_best: similarity,
      source: "prewarm",
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "query_normalized" });

    await new Promise((r) => setTimeout(r, 120));
  }

  await supa.from("ai_prewarm_runs").upsert({
    workspace_id: workspaceId,
    last_run_at: new Date().toISOString(),
    queries_count: PREWARM_QUERIES.length,
    cache_hits: cacheHits,
    llm_calls: llmCalls,
  }, { onConflict: "workspace_id" });

  return new Response(JSON.stringify({
    ok: true,
    queries: PREWARM_QUERIES.length,
    cache_hits: cacheHits,
    semantic_hits: semanticHits,
    llm_calls: llmCalls,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
