import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

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

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Embedding API error:", errorText);
    throw new Error(`embedding_failed: ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
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

    console.log("Search query:", body.query);
    console.log("Filter types:", body.filter_types);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(body.query);

    // Search for similar resources using the database function
    const { data: results, error } = await supabase.rpc("search_similar_resources", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: body.match_threshold || 0.7,
      match_count: body.match_count || 5,
      filter_types: body.filter_types || null,
    });

    if (error) {
      console.error("Search error:", error);
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

    console.log(`Found ${dedupedResults.length} unique results`);

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
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error), results: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
