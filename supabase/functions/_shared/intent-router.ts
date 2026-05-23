// Intent Router v1 - Phase IA-1
// Classifies a user query into one of 5 intents and composes a modular
// system prompt by loading `master-agent-core` + the matching module,
// instead of the full 27K master-agent monolith.
//
// Cascade fallback: any failure (classification, missing core, missing
// module) falls back to the legacy monolithic composition handled by
// the caller (ai-agent-orchestrator).

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CLASSIFIER_MODEL = "google/gemini-2.5-flash-lite";

export type Intent =
  | "crm_query"
  | "doc_generation"
  | "analysis"
  | "vivier"
  | "general";

const INTENT_TO_MODULE: Record<Intent, string> = {
  crm_query: "master-agent-module-crm",
  doc_generation: "master-agent-module-docs",
  analysis: "master-agent-module-analysis",
  vivier: "master-agent-module-vivier",
  general: "master-agent-module-general",
};

// Phase IA-1 v2 : tools-reference split per intent
// Always load `tools-reference-core`. Additional tool modules per intent.
const INTENT_TO_TOOL_MODULES: Record<Intent, string[]> = {
  crm_query: ["tools-reference-crm"],
  doc_generation: ["tools-reference-crm", "tools-reference-docs"],
  analysis: ["tools-reference-crm", "tools-reference-analysis"],
  vivier: ["tools-reference-crm", "tools-reference-admin"],
  general: ["tools-reference-admin", "tools-reference-crm"],
};

// In-memory cache: query (lowercased+trimmed) -> { intent, ts }
const intentCache = new Map<string, { intent: Intent; ts: number }>();
const CACHE_TTL_MS = 60_000;

function cacheGet(key: string): Intent | null {
  const hit = intentCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    intentCache.delete(key);
    return null;
  }
  return hit.intent;
}

function cacheSet(key: string, intent: Intent) {
  intentCache.set(key, { intent, ts: Date.now() });
  // Soft cap
  if (intentCache.size > 500) {
    const firstKey = intentCache.keys().next().value;
    if (firstKey) intentCache.delete(firstKey);
  }
}

const CLASSIFIER_SYSTEM = `Tu es un classifieur d'intention pour Nicolas (assistant IArche).
Réponds UNIQUEMENT avec un des labels suivants, sans aucun autre texte :
- crm_query : recherche / lecture / mise à jour leads, contacts, partenaires, opportunités, scoring
- doc_generation : génération devis, CDC, proposition commerciale, email commercial
- analysis : synthèse 360°, transcription, analyse de meeting, copilot stratégique
- vivier : prospection B2B, viviers, campagnes Instantly
- general : salutation, question générale, navigation, autre

Si doute → general.`;

/**
 * Classifies a user query into one of 5 intents.
 * Cached for 60s. Returns "general" on any failure (safe default).
 */
export async function classifyIntent(query: string): Promise<Intent> {
  const key = (query || "").trim().toLowerCase().slice(0, 500);
  if (!key) return "general";

  const cached = cacheGet(key);
  if (cached) return cached;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("[intent-router] LOVABLE_API_KEY missing, defaulting to general");
    return "general";
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: CLASSIFIER_SYSTEM },
          { role: "user", content: query.slice(0, 1000) },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    clearTimeout(timer);

    if (!resp.ok) {
      console.warn("[intent-router] classifier HTTP", resp.status);
      return "general";
    }
    const json = await resp.json();
    const raw = (json?.choices?.[0]?.message?.content || "")
      .toLowerCase()
      .trim();

    const intent: Intent =
      (["crm_query", "doc_generation", "analysis", "vivier", "general"] as Intent[])
        .find((i) => raw.includes(i)) || "general";

    cacheSet(key, intent);
    return intent;
  } catch (err) {
    console.warn("[intent-router] classification failed:", (err as Error).message);
    return "general";
  }
}

export interface ComposedPrompt {
  prompt: string;
  model: string;
  intent: Intent;
  modulesLoaded: string[];
  used_router: boolean; // false => caller should fall back
}

/**
 * Composes a modular system prompt for the given user query.
 * Hierarchy: governor → master-agent-core → module_{intent} → ui-navigation → tools-reference
 *
 * Returns used_router=false if core or module is missing (caller should
 * fall back to the legacy monolithic composer).
 */
// deno-lint-ignore no-explicit-any
export async function composeSystemPromptForRequest(
  supabase: any,
  userQuery: string,
): Promise<ComposedPrompt> {
  const intent = await classifyIntent(userQuery);
  const moduleSlug = INTENT_TO_MODULE[intent];
  const toolModuleSlugs = INTENT_TO_TOOL_MODULES[intent];

  // Build the fetch list: core blocks + intent module + tools-core + per-intent tools
  // We also fetch the legacy `tools-reference` as a fallback in case the split
  // modules are missing in the DB (graceful degradation).
  const slugs = [
    "orchestrator-governor",
    "master-agent-core",
    moduleSlug,
    "ui-navigation",
    "tools-reference-core",
    ...toolModuleSlugs,
    "tools-reference", // fallback only
  ];

  const { data, error } = await supabase
    .from("ai_prompts")
    .select("slug, system_prompt, model_config")
    .in("slug", slugs);

  if (error) {
    console.warn("[intent-router] ai_prompts fetch error:", error.message);
    return {
      prompt: "",
      model: "google/gemini-2.5-flash",
      intent,
      modulesLoaded: [],
      used_router: false,
    };
  }

  const bySlug = new Map<string, { system_prompt?: string; model_config?: { model?: string } }>();
  for (const row of data || []) bySlug.set(row.slug, row);

  const core = bySlug.get("master-agent-core")?.system_prompt?.trim();
  const moduleBlock = bySlug.get(moduleSlug)?.system_prompt?.trim();
  if (!core || !moduleBlock) {
    console.warn(
      `[intent-router] missing core(${!!core}) or module ${moduleSlug}(${!!moduleBlock}), falling back`,
    );
    return {
      prompt: "",
      model: "google/gemini-2.5-flash",
      intent,
      modulesLoaded: [],
      used_router: false,
    };
  }

  const governor = bySlug.get("orchestrator-governor")?.system_prompt?.trim() || "";
  const uiNav = bySlug.get("ui-navigation")?.system_prompt?.trim() || "";

  // Tools assembly: prefer split modules; fall back to monolithic tools-reference if core split missing
  const toolsCore = bySlug.get("tools-reference-core")?.system_prompt?.trim();
  let toolsBlock = "";
  const loadedToolSlugs: string[] = [];
  if (toolsCore) {
    const toolParts: string[] = [toolsCore];
    loadedToolSlugs.push("tools-reference-core");
    for (const ts of toolModuleSlugs) {
      const t = bySlug.get(ts)?.system_prompt?.trim();
      if (t) {
        toolParts.push(`\n---\n\n${t}`);
        loadedToolSlugs.push(ts);
      }
    }
    toolsBlock = toolParts.join("\n");
  } else {
    // graceful fallback to legacy monolithic tools-reference
    toolsBlock = bySlug.get("tools-reference")?.system_prompt?.trim() || "";
    if (toolsBlock) loadedToolSlugs.push("tools-reference");
  }

  const model =
    bySlug.get("master-agent-core")?.model_config?.model || "google/gemini-2.5-flash";

  const parts: string[] = [
    `### AGENT IA IARCHE - PROMPT SYSTÈME MODULAIRE v6.1 (router=${intent})`,
    `### Hiérarchie: governor → core → module(${moduleSlug}) → ui-navigation → tools(${loadedToolSlugs.join("+")})`,
    ``,
  ];
  if (governor) parts.push(`## NIVEAU 0 - GOUVERNEUR`, governor, ``, `---`, ``);
  parts.push(`## NIVEAU 1 - IDENTITÉ AGENT (CORE)`, core, ``, `---`, ``);
  parts.push(`## NIVEAU 1.B - MODULE SPÉCIALISÉ`, moduleBlock, ``, `---`, ``);
  if (uiNav) parts.push(`## NIVEAU 2 - NAVIGATION`, uiNav, ``, `---`, ``);
  if (toolsBlock) parts.push(`## NIVEAU 3 - OUTILS`, toolsBlock);

  const composed = parts.join("\n");
  const modulesLoaded = [
    "orchestrator-governor",
    "master-agent-core",
    moduleSlug,
    "ui-navigation",
    ...loadedToolSlugs,
  ].filter((s) => bySlug.has(s));

  console.log(
    `[intent-router] intent=${intent} chars=${composed.length} modules=${modulesLoaded.length} tools=${loadedToolSlugs.join(",")}`,
  );

  return {
    prompt: composed,
    model,
    intent,
    modulesLoaded,
    used_router: true,
  };
}
