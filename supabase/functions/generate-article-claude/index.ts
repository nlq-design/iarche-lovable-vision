import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

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
    
    console.log(`Generating article with Claude - tone: ${tone}, length: ${length}, template: ${templateId || 'custom'}`);

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', response.status, errorData);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Claude response received');
    
    const content = data.content[0].text;
    
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
    console.error('Error in generate-article-claude:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
