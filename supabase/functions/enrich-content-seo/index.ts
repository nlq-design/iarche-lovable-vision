const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[enrich-content-seo] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log('[enrich-content-seo] Calling Lovable AI for SEO enrichment');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[enrich-content-seo] Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const enrichedContent = data.choices?.[0]?.message?.content;

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
    console.error('[enrich-content-seo] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
