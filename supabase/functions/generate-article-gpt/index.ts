import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  brief: string;
  tone: 'expert' | 'vulgarise' | 'technique';
  length: 'court' | 'moyen' | 'long';
  templateId?: string;
}

const lengthMap = {
  court: '800 mots',
  moyen: '1500 mots',
  long: '2500 mots'
};

const toneMap = {
  expert: 'professionnel, pour décideurs B2B et directions métier',
  vulgarise: 'accessible, pédagogique, pour un public non-expert',
  technique: 'technique et précis, pour développeurs et experts IT'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brief, tone, length, templateId }: RequestBody = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const prompt = await loadPrompt(supabase, "content-article-b2b", {
      system_prompt: `Tu es un rédacteur expert pour IArche, une agence IA basée à Bayonne. 
Tu rédiges des articles de blog professionnels sur l'IA pour les PME françaises.

Style IArche :
- Ton direct et pragmatique, pas de langue de bois
- Exemples concrets et chiffrés
- Vocabulaire simple sauf jargon nécessaire
- Orientation bénéfice client

Format de sortie OBLIGATOIRE (JSON) :
{
  "title": "Titre accrocheur (60-70 caractères)",
  "excerpt": "Résumé en 2 phrases (150-160 caractères)",
  "content": "Contenu Markdown complet avec H2, H3, listes, etc.",
  "faq": [{"question": "...", "answer": "..."}],
  "metaTitle": "Title SEO (55-60 caractères)",
  "metaDescription": "Description SEO (150-160 caractères)",
  "tags": ["tag1", "tag2", "tag3"]
}`
    });

    const temperature = (prompt.model_config?.temperature as number) ?? 0.7;

    let templateInstruction = '';
    if (templateId && templateId !== 'custom') {
      templateInstruction = `\nIMPORTANT : Le brief ci-dessous contient une structure de template pré-définie. Suis scrupuleusement cette structure et réponds à chaque section demandée.`;
    }

    const userPrompt = `Rédige un article de blog sur le sujet suivant :

BRIEF :
${brief}${templateInstruction}

CONTRAINTES :
- Ton : ${toneMap[tone]}
- Longueur : environ ${lengthMap[length]}
- Inclure 3-5 questions FAQ pertinentes
- Optimisé SEO pour "agence IA" et mots-clés du sujet

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    const content = await callLLM(
      [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: userPrompt }
      ],
      { functionName: 'generate-article-gpt', maxTokens: 8192, temperature }
    );

    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const article = JSON.parse(cleanedContent.trim());

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-article-gpt] Error:', error);
    const errorMessage = (error as Error).message;
    let statusCode = 500;
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) statusCode = 429;
    else if (errorMessage.includes('402') || errorMessage.includes('quota')) statusCode = 402;
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
