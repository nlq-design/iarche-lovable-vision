// Public RAG chatbot — vrai RAG vectoriel sur contenus publics (Phase IA-0)
// 1. Embed query utilisateur
// 2. Recherche vectorielle sur resource_embeddings WHERE is_public = true
// 3. Si match : injecte contexte dans prompt Nicolas (DB) + stream Lovable AI
// 4. Si no-match : fallback humain zero-LLM (économie tokens)

import { createClient } from "npm:@supabase/supabase-js@2";
import { loadPrompt } from "../_shared/prompt-loader.ts";
import { buildCacheKey, buildContextFingerprint, lookupCache, storeCache, trackCacheTrace } from "../_shared/semantic-cache.ts";

// Workspace IArche Interne (cache mutualisé pour tout le trafic public)
const PUBLIC_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const CACHE_TTL_HOURS = 168; // 7 jours (contenu marketing stable)
const CACHE_THRESHOLD = 0.93;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_PROMPT = `Tu es Nicolas, l'assistant IArche (Bayonne, expert IA pour PME/ETI). Style direct, chaleureux, zéro emoji, 3-6 phrases en français. Si l'info n'est pas dans le contexte fourni, dis-le et invite à /contact. N'invente jamais de chiffres ou références.\n\n# Contexte RAG\n{{rag_context}}`;

const NO_MATCH_REPLY = `Je n'ai pas cette information précise dans nos contenus publics. Le mieux est d'en parler de vive voix avec l'équipe : rendez-vous sur /contact pour échanger directement avec un expert IArche.`;

// Doit matcher le modèle utilisé pour indexer resource_embeddings (cf. _shared/ai-client.ts → preferredOrder embed = openai)
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const CHAT_MODEL = "google/gemini-2.5-flash";
const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.35;

function streamPlainTextAsSSE(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunks = text.match(/.{1,40}/gs) ?? [text];
      for (const c of chunks) {
        const payload = JSON.stringify({ choices: [{ delta: { content: c } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userQuery = (lastUserMsg?.content ?? "").toString().trim();

    if (!userQuery) {
      return new Response(JSON.stringify({ error: "Empty user query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 1. Embed user query ----
    const embedRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: userQuery,
        dimensions: 1536,
      }),
    });

    if (!embedRes.ok) {
      if (embedRes.status === 429 || embedRes.status === 402) {
        return new Response(JSON.stringify({ error: embedRes.status === 429 ? "Trop de requêtes, réessayez dans un instant." : "Crédits IA épuisés." }), {
          status: embedRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[public-rag-chat] embedding error:", embedRes.status, await embedRes.text());
      return new Response(JSON.stringify({ error: "Erreur embedding" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedJson = await embedRes.json();
    const queryEmbedding: number[] = embedJson?.data?.[0]?.embedding ?? [];
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // ---- 2. Vector search ----
    const { data: matches, error: rpcErr } = await supabase.rpc("match_public_embeddings", {
      query_embedding_text: embeddingStr,
      match_count: TOP_K,
      similarity_threshold: SIMILARITY_THRESHOLD,
    });

    if (rpcErr) {
      console.error("[public-rag-chat] RPC error:", JSON.stringify(rpcErr));
    }

    const hits = Array.isArray(matches) ? matches : [];
    const topSim = hits[0]?.similarity ?? 0;
    console.log(`[public-rag-chat] q="${userQuery.slice(0, 60)}" hits=${hits.length} top_sim=${Number(topSim).toFixed(3)}`);

    // ---- Phase IA-2K — Self-Healing: log questions sans réponse satisfaisante ----
    // (no_match OU low_confidence < 0.5) → analyse asynchrone par rag-content-gap-detector
    const LOW_CONFIDENCE_THRESHOLD = 0.5;
    const needsLogging = hits.length === 0 || topSim < LOW_CONFIDENCE_THRESHOLD;
    if (needsLogging && userQuery.length >= 6 && userQuery.length <= 500) {
      const normalized = userQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
      supabase.from("public_rag_unanswered").insert({
        query: userQuery,
        normalized_query: normalized,
        query_embedding: embeddingStr,
        top_similarity: Number(topSim.toFixed(3)),
        hits_count: hits.length,
        reason: hits.length === 0 ? "no_match" : "low_confidence",
        user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      }).then(({ error }) => {
        if (error) console.error("[public-rag-chat] unanswered log error:", error.message);
      });
    }

    // ---- 3. No-match : fallback zero-LLM ----
    if (hits.length === 0) {
      return new Response(streamPlainTextAsSSE(NO_MATCH_REPLY), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ---- 4. Build RAG context + load prompt ----
    const ragContext = hits
      .map((h: any, i: number) =>
        `[Extrait ${i + 1} — ${h.resource_type} : ${h.resource_title ?? "sans titre"} (similarité ${h.similarity.toFixed(2)})]\n${h.content_chunk}`
      )
      .join("\n\n---\n\n");

    const prompt = await loadPrompt(supabase, "public-rag-chat-nicolas", {
      system_prompt: FALLBACK_PROMPT,
    });

    const systemPrompt = prompt.system_prompt.replace("{{rag_context}}", ragContext);
    const model = (prompt.model_config?.model as string) ?? CHAT_MODEL;
    const promptVersion = (prompt.model_config?.version as string) ?? prompt.slug ?? "public-rag-chat-nicolas";

    // ---- 4b. Semantic cache lookup (v1.1) ----
    // Clé : workspace IArche + mode public_rag + entityType public + 'global'
    // Fingerprint matériel = top-3 chunk IDs + prompt version (invalidé si RAG change)
    const cacheKey = buildCacheKey({
      workspaceId: PUBLIC_WORKSPACE_ID,
      mode: "public_rag",
      entityType: "public",
      entityId: "global",
    });
    const topChunkIds = hits.slice(0, 3).map((h: any) => h.id ?? h.resource_id ?? "").join("|");
    const fingerprint = await buildContextFingerprint({
      entityType: "public",
      entityId: "global",
      workspaceId: PUBLIC_WORKSPACE_ID,
      userId: "anonymous",
      entityUpdatedAt: null,
      ragChunksCount: hits.length,
      promptVersion,
      extra: { top_chunks: topChunkIds },
      cacheScope: "system",
    });

    const cached = await lookupCache({
      supabase,
      workspaceId: PUBLIC_WORKSPACE_ID,
      cacheKey,
      queryText: userQuery,
      fingerprint,
      threshold: CACHE_THRESHOLD,
    });

    if (cached.hit && typeof cached.response === "string") {
      console.log(`[public-rag-chat] CACHE HIT sim=${cached.similarity.toFixed(3)} age=${cached.ageSeconds}s hits=${cached.hitCount}`);
      trackCacheTrace({
        supabase, workspaceId: PUBLIC_WORKSPACE_ID, mode: "public_rag",
        cacheStatus: "hit", cacheScope: "system",
        cacheSimilarity: cached.similarity, cacheAgeSeconds: cached.ageSeconds,
        llmProvider: cached.model ?? null, entityType: "public", entityId: null,
      });
      return new Response(streamPlainTextAsSSE(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "HIT" },
      });
    }

    // ---- 5. Stream LLM (cache miss) ----
    const missStart = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ error: response.status === 429 ? "Trop de requêtes, réessayez dans un instant." : "Crédits IA épuisés côté IArche." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[public-rag-chat] gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Erreur passerelle IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 5b. Tee stream pour capter la réponse complète et la stocker en cache ----
    const decoder = new TextDecoder();
    let fullContent = "";
    const passthrough = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = decoder.decode(chunk, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]" || !payload) continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") fullContent += delta;
          } catch { /* ignore SSE parse errors */ }
        }
      },
      flush() {
        if (fullContent && fullContent.length > 20) {
          // Fire-and-forget : ne bloque pas la fermeture du stream
          storeCache({
            supabase,
            workspaceId: PUBLIC_WORKSPACE_ID,
            cacheKey,
            queryText: userQuery,
            fingerprint,
            response: fullContent,
            model,
            promptVersion,
            ttlHours: CACHE_TTL_HOURS,
          }).catch((e) => console.warn("[public-rag-chat] cache store failed:", e?.message));
          console.log(`[public-rag-chat] CACHE STORE len=${fullContent.length} model=${model}`);
        }
        // Trace miss avec latence réelle (estimation coût gemini-2.5-flash : ~$0.0005 / appel public RAG moyen)
        trackCacheTrace({
          supabase, workspaceId: PUBLIC_WORKSPACE_ID, mode: "public_rag",
          cacheStatus: "miss", cacheScope: "system",
          latencyMs: Date.now() - missStart,
          llmProvider: model, llmCostEstimateUsd: 0.0005,
          entityType: "public", entityId: null,
        });
      },
    });

    return new Response(response.body!.pipeThrough(passthrough), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("[public-rag-chat] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
