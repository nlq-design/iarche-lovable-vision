import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLLM } from "../_shared/ai-client.ts";

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
    
    console.log(`[generate-article-claude] Generating article via centralized AI client - tone: ${tone}, length: ${length}, template: ${templateId || 'custom'}`);

    const systemPrompt = `Tu es un rédacteur expert pour IArche, une agence IA basée à Bayonne. 
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
  "faq": [
    {"question": "Question 1", "answer": "Réponse 1"},
    {"question": "Question 2", "answer": "Réponse 2"},
    {"question": "Question 3", "answer": "Réponse 3"}
  ],
  "metaTitle": "Title SEO (55-60 caractères)",
  "metaDescription": "Description SEO (150-160 caractères)",
  "tags": ["tag1", "tag2", "tag3"]
}`;

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

    // Use centralized AI client with automatic DB config lookup
    // The provider/model is now controlled via edge_function_model_config table
    const content = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        functionName: 'generate-article-claude', // <-- Auto-lookup from DB
        maxTokens: 4096
      }
    );

    console.log('[generate-article-claude] Response received via centralized client');
    
    // Nettoyer la réponse pour extraire le JSON pur
    let cleanedContent = content.trim();
    
    // Supprimer les balises markdown si présentes
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    // Parser le JSON nettoyé
    const article = JSON.parse(cleanedContent.trim());

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[generate-article-claude] Error:', error);
    
    // Handle specific AI errors
    const errorMessage = (error as Error).message;
    let statusCode = 500;
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      statusCode = 429;
    } else if (errorMessage.includes('402') || errorMessage.includes('quota')) {
      statusCode = 402;
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
