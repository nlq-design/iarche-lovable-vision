import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
    
    console.log('Suggesting tags for article:', title);

    const prompt = `Analyse cet article et suggère 5-8 tags pertinents en français.

TITRE : ${title}

EXTRAIT : ${excerpt || ''}

CONTENU : ${content.substring(0, 1500)}

Les tags doivent être :
- Spécifiques et pertinents
- En français
- Courts (1-3 mots maximum)
- Liés à l'IA, la technologie, ou le sujet de l'article
- Utiles pour le SEO

Réponds UNIQUEMENT avec un tableau JSON de strings, sans texte avant ou après.
Exemple : ["Intelligence Artificielle", "PME", "CLM", "Automatisation"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte Lovable AI.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI response:', aiResponse);
    
    // Parser le JSON des tags
    let tags: string[];
    try {
      // Extraire le JSON du texte (au cas où il y aurait du texte avant/après)
      const jsonMatch = aiResponse.match(/\[.*\]/s);
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0]);
      } else {
        tags = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Error parsing tags:', parseError);
      // Fallback: essayer de split par ligne ou virgule
      tags = aiResponse
        .replace(/[\[\]"]/g, '')
        .split(/[,\n]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
    }

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in suggest-tags:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
