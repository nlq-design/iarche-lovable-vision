// Public RAG chatbot — vrai RAG vectoriel sur contenus publics (Phase IA-0)
// 1. Embed query utilisateur
// 2. Recherche vectorielle sur resource_embeddings WHERE is_public = true
// 3. Si match : injecte contexte dans prompt Nicolas (DB) + stream Lovable AI
// 4. Si no-match : fallback humain zero-LLM (économie tokens)

import { createClient } from "npm:@supabase/supabase-js@2";
import { loadPrompt } from "../_shared/prompt-loader.ts";

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

    // ---- 5. Stream LLM ----
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[public-rag-chat] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
