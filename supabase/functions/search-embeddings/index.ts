import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateEmbedding, callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SearchRequest {
  query: string;
  filter_types?: string[];
  match_threshold?: number;
  match_count?: number;
  // NEW: RAG synthesis options
  synthesize?: boolean; // If true, pass chunks through LLM for synthesis
  conversation_context?: string; // Last 3 messages from conversation
  entity_context?: string; // Lead/project/partner context
  mode?: 'short' | 'detailed'; // Response format
}

interface SearchResult {
  resource_id: string;
  resource_type: string;
  resource_title: string;
  resource_slug: string;
  content_chunk: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: SearchRequest = await req.json();

    if (!body.query) {
      throw new Error("query is required");
    }

    console.log("[search-embeddings] Query:", body.query);
    console.log("[search-embeddings] Filter types:", body.filter_types);
    console.log("[search-embeddings] Synthesize:", body.synthesize);

    // ============================================================
    // QW#9d HYBRID — Resolve caller workspace_id for tenant isolation
    // - Admin (super_admin) → bypass: pass NULL (no tenant filter)
    // - Authenticated user  → resolve via workspace_members (first match)
    // - Anonymous (no auth) → bypass NULL (CMS-only access via filter_types)
    // ============================================================
    let resolvedWorkspaceId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (userId) {
          // Check admin bypass
          const { data: isAdminRes } = await supabase.rpc("has_role" as any, {
            _user_id: userId,
            _role: "admin",
          });
          if (isAdminRes === true) {
            resolvedWorkspaceId = null; // bypass
            console.log("[search-embeddings] Admin bypass: no tenant filter");
          } else {
            const { data: ws } = await supabase
              .from("workspace_members")
              .select("workspace_id")
              .eq("user_id", userId)
              .limit(1)
              .maybeSingle();
            resolvedWorkspaceId = ws?.workspace_id ?? null;
            console.log(`[search-embeddings] Resolved workspace_id=${resolvedWorkspaceId}`);
          }
        }
      } catch (authErr) {
        console.warn("[search-embeddings] Auth resolution failed (treating as anon):", authErr);
      }
    }

    // Generate embedding using centralized AI client
    const queryEmbedding = await generateEmbedding(body.query, { 
      functionName: 'search-embeddings' 
    });

    // Search using text wrapper RPC for proper vector casting
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    console.log(`[search-embeddings] Embedding generated, ${queryEmbedding.length} dims, calling RPC...`);
    
    const { data: results, error } = await supabase.rpc("search_similar_resources_text" as any, {
      query_embedding_text: embeddingStr,
      match_threshold: body.match_threshold || 0.7,
      match_count: body.match_count || 5,
      filter_types: body.filter_types || null,
      p_workspace_id: resolvedWorkspaceId,
    });

    if (error) {
      console.error("[search-embeddings] Search error:", JSON.stringify(error));
      throw error;
    }
    
    console.log(`[search-embeddings] RPC returned ${results?.length || 0} results`);

    // Deduplicate by resource_id, keeping highest similarity
    const deduped = new Map<string, SearchResult>();
    for (const result of results || []) {
      const existing = deduped.get(result.resource_id);
      if (!existing || result.similarity > existing.similarity) {
        deduped.set(result.resource_id, result);
      }
    }

    const dedupedResults = Array.from(deduped.values()).sort(
      (a, b) => b.similarity - a.similarity
    );

    console.log(`[search-embeddings] Found ${dedupedResults.length} unique results`);

    // =============================================
    // RAG SYNTHESIS: If requested, pass through LLM
    // =============================================
    if (body.synthesize && dedupedResults.length > 0) {
      try {
        // Load keyword aliases for query normalization
        let keywordAliases = "";
        try {
          const { data: aliases } = await supabase
            .from("keyword_aliases")
            .select("term, canonical, category")
            .limit(50);
          if (aliases?.length) {
            keywordAliases = aliases.map((a: { term: string; canonical: string; category: string | null }) => 
              `${a.term} → ${a.canonical}${a.category ? ` (${a.category})` : ''}`
            ).join("\n");
          }
        } catch { /* non-blocking */ }

        // Format chunks for LLM
        const chunksFormatted = dedupedResults.map((r, i) => 
          `### Chunk ${i + 1}\n- **Titre**: ${r.resource_title}\n- **Type**: ${r.resource_type}\n- **Slug**: ${r.resource_slug}\n- **Similarity**: ${(r.similarity * 100).toFixed(1)}%\n- **Contenu**:\n${r.content_chunk}`
        ).join("\n\n---\n\n");

        // Load RAG prompt from DB with hardcoded fallback
        const ragPrompt = await loadPrompt(supabase, "rag-knowledge-search", {
          system_prompt: "Tu es un moteur de synthèse RAG. Synthétise les chunks fournis en une réponse sourcée et concise. Chaque affirmation doit citer sa source [Source: Titre (type)]. Ne jamais inventer d'information.",
          user_prompt: "Chunks:\n{chunks}\n\nRequête: {query}\n\nSynthétise.",
        });

        // Build user prompt with variables
        const userPrompt = (ragPrompt.user_prompt || "Chunks:\n{chunks}\n\nRequête: {query}")
          .replace("{query}", body.query)
          .replace("{chunks}", chunksFormatted)
          .replace("{conversation_context}", body.conversation_context || "Aucun")
          .replace("{entity_context}", body.entity_context || "Aucun")
          .replace("{keyword_aliases}", keywordAliases || "Aucun");

        // Call LLM via centralized client
        const synthesizedResponse = await callLLM(
          [
            { role: "system", content: ragPrompt.system_prompt },
            { role: "user", content: userPrompt },
          ],
          {
            functionName: 'search-embeddings-rag',
            maxTokens: (ragPrompt.model_config?.max_tokens as number) || 2048,
            temperature: (ragPrompt.model_config?.temperature as number) || 0.3,
          }
        );

        console.log(`[search-embeddings] RAG synthesis complete (${synthesizedResponse.length} chars)`);

        return new Response(
          JSON.stringify({
            success: true,
            synthesized: true,
            synthesis: synthesizedResponse,
            results: dedupedResults,
            query: body.query,
            sources_count: dedupedResults.length,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (synthError) {
        console.error("[search-embeddings] Synthesis error, falling back to raw results:", synthError);
        // Fall through to raw results below
      }
    }

    // Return raw results (backward compatible)
    return new Response(
      JSON.stringify({
        success: true,
        synthesized: false,
        results: dedupedResults,
        query: body.query,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[search-embeddings] Error:", error);
    
    const message = (error as Error).message || 'Unknown error';
    
    // Handle rate limits
    if (message.includes('rate_limit') || message.includes('429')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded', results: [] }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: String(error), results: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
