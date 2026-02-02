import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateEmbedding } from "../_shared/ai-client.ts";

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

    // Generate embedding using centralized AI client
    // Config is fetched from edge_function_model_config if available
    const queryEmbedding = await generateEmbedding(body.query, { 
      functionName: 'search-embeddings' 
    });

    // Search for similar resources using the database function
    const { data: results, error } = await supabase.rpc("search_similar_resources", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: body.match_threshold || 0.7,
      match_count: body.match_count || 5,
      filter_types: body.filter_types || null,
    });

    if (error) {
      console.error("[search-embeddings] Search error:", error);
      throw error;
    }

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

    return new Response(
      JSON.stringify({
        success: true,
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
