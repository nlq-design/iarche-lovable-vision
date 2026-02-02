import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractStructured } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  title: string;
  content: string;
  excerpt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, excerpt }: RequestBody = await req.json();
    
    console.log('[suggest-tags] Processing article:', title);

    const prompt = `Analyse cet article et suggère 5-8 tags pertinents en français.

TITRE : ${title}

EXTRAIT : ${excerpt || ''}

CONTENU : ${content.substring(0, 1500)}

Les tags doivent être :
- Spécifiques et pertinents
- En français
- Courts (1-3 mots maximum)
- Liés à l'IA, la technologie, ou le sujet de l'article
- Utiles pour le SEO`;

    // Use centralized AI client with automatic DB config lookup
    const result = await extractStructured<{ tags: string[] }>(
      [{ role: 'user', content: prompt }],
      {
        name: 'extract_tags',
        description: 'Extract relevant tags from article content',
        parameters: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of 5-8 relevant tags in French'
            }
          },
          required: ['tags']
        }
      },
      { functionName: 'suggest-tags' } // <-- Auto-lookup from DB
    );

    console.log('[suggest-tags] AI response:', result);

    if (!result) {
      throw new Error('Failed to extract tags from AI response');
    }

    return new Response(JSON.stringify({ tags: result.tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[suggest-tags] Error:', error);
    
    const message = (error as Error).message || 'Unknown error';
    
    // Handle rate limits and payment errors
    if (message.includes('rate_limit') || message.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.' }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (message.includes('payment') || message.includes('402')) {
      return new Response(
        JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' }), 
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
