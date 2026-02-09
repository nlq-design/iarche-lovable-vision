import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, resourceType } = await req.json();
    
    if (!content) {
      return new Response(JSON.stringify({ error: 'Content is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = await loadPrompt(supabase, "content-seo-enrichment", {
      system_prompt: `Tu es un expert SEO. Enrichis le contenu HTML en ajoutant des <strong> autour des mots-clés stratégiques.

RÈGLES :
1. Conserve EXACTEMENT la structure HTML existante
2. Ajoute UNIQUEMENT des <strong> autour des mots-clés stratégiques
3. Ne modifie JAMAIS le texte
4. Maximum 2-3% du texte en gras
5. Ne mets PAS en gras : articles, prépositions, pronoms
6. Retourne UNIQUEMENT le HTML enrichi`
    });

    const enrichedContent = await callLLM(
      [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: `Enrichis ce contenu HTML en ajoutant des <strong> sur les mots-clés SEO importants :\n\n${content}` }
      ],
      { functionName: 'enrich-content-seo', temperature: 0.3 }
    );

    if (!enrichedContent) {
      return new Response(JSON.stringify({ error: 'Failed to enrich content' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ enrichedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[enrich-content-seo] Error:', error);
    const message = (error as Error).message || 'Unknown error';
    let statusCode = 500;
    if (message.includes('rate_limit') || message.includes('429')) statusCode = 429;
    else if (message.includes('402') || message.includes('quota')) statusCode = 402;
    
    return new Response(JSON.stringify({ error: message }), {
      status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
