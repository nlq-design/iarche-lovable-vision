import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { extractStructured } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = await loadPrompt(supabase, "content-tags", {
      system_prompt: `Analyse cet article et suggère 5-8 tags pertinents en français.
Les tags doivent être spécifiques, courts (1-3 mots), liés à l'IA/technologie et utiles pour le SEO.`
    });

    const userPrompt = `${prompt.system_prompt}

TITRE : ${title}
EXTRAIT : ${excerpt || ''}
CONTENU : ${content.substring(0, 1500)}`;

    const result = await extractStructured<{ tags: string[] }>(
      [{ role: 'user', content: userPrompt }],
      {
        name: 'extract_tags',
        description: 'Extract relevant tags from article content',
        parameters: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' }, description: 'List of 5-8 relevant tags in French' }
          },
          required: ['tags']
        }
      },
      { functionName: 'suggest-tags' }
    );

    if (!result) throw new Error('Failed to extract tags');

    return new Response(JSON.stringify({ tags: result.tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[suggest-tags] Error:', error);
    const message = (error as Error).message || 'Unknown error';
    if (message.includes('429')) return new Response(JSON.stringify({ error: 'Limite atteinte.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (message.includes('402')) return new Response(JSON.stringify({ error: 'Crédits insuffisants.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
