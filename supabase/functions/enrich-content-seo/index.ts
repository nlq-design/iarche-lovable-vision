import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLLM } from "../_shared/ai-client.ts";

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
      console.error('[enrich-content-seo] Missing content parameter');
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-content-seo] Starting SEO enrichment for resource type:', resourceType);

    // Prompt système pour enrichissement SEO
    const systemPrompt = `Tu es un expert SEO. Ta mission est d'enrichir le contenu HTML fourni en ajoutant des balises <strong> autour des mots-clés et concepts importants pour améliorer le référencement naturel.

RÈGLES STRICTES :
1. Conserve EXACTEMENT la structure HTML existante (balises, attributs, classes)
2. Ajoute UNIQUEMENT des balises <strong> autour des mots-clés stratégiques
3. Ne modifie JAMAIS le texte, seulement ajoute des <strong>
4. Privilégie : termes techniques, concepts clés, mots-clés métier, expressions importantes
5. Maximum 2-3% du texte total doit être en gras (ne pas surcharger)
6. Ne mets PAS en gras : articles, prépositions, pronoms, mots de liaison
7. Retourne UNIQUEMENT le HTML enrichi, sans commentaires ni explications
8. Si le contenu contient déjà des <strong>, respecte-les et ajoutes-en d'autres si pertinent`;

    const userPrompt = `Enrichis ce contenu HTML en ajoutant des <strong> sur les mots-clés SEO importants :

${content}`;

    console.log('[enrich-content-seo] Calling centralized AI client');

    // Use centralized AI client with automatic DB config lookup
    const enrichedContent = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        functionName: 'enrich-content-seo',
        temperature: 0.3
      }
    );

    if (!enrichedContent) {
      console.error('[enrich-content-seo] No enriched content returned from AI');
      return new Response(
        JSON.stringify({ error: 'Failed to enrich content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-content-seo] SEO enrichment successful');

    return new Response(
      JSON.stringify({ enrichedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-content-seo] Error:', error);
    
    const message = (error as Error).message || 'Unknown error';
    let statusCode = 500;
    
    if (message.includes('rate_limit') || message.includes('429')) {
      statusCode = 429;
    } else if (message.includes('402') || message.includes('quota')) {
      statusCode = 402;
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
