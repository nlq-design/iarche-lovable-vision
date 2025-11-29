import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  article_id: string;
  lookback_days?: number; // Nombre de jours à analyser (défaut: 30)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id, lookback_days = 30 }: RequestBody = await req.json();

    if (!article_id) {
      throw new Error('article_id is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer l'article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('title, content, resource_type')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      throw new Error('Article not found');
    }

    // Récupérer les commentaires récents sur cet article
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookback_days);

    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('content, author_name, created_at')
      .eq('article_id', article_id)
      .eq('approved', true)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (commentsError) {
      throw new Error(`Failed to fetch comments: ${commentsError.message}`);
    }

    if (!comments || comments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Pas assez de commentaires pour analyser',
          suggested_questions: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construire le prompt d'analyse
    const systemPrompt = `Tu es un expert en analyse de contenu et en génération de FAQ.
Ton rôle : analyser les commentaires des utilisateurs sur un article pour identifier les questions implicites ou préoccupations récurrentes.

Règles strictes :
- Identifier les questions posées directement OU implicitement dans les commentaires
- Détecter les points de confusion récurrents
- Anticiper les questions logiques non posées mais suggérées par les commentaires
- Générer des réponses empathiques et claires (2-3 phrases max)
- Ignorer les commentaires non pertinents (remerciements, spam, etc.)

Génère entre 3 et 6 questions uniques.

Format de réponse UNIQUEMENT en JSON :
[
  {"question": "...", "answer": "...", "frequency": 1-5},
]

frequency = score de pertinence (1=rare, 5=très fréquent)`;

    const commentsText = comments
      .map((c, i) => `Commentaire ${i + 1} (${c.author_name}, ${new Date(c.created_at).toLocaleDateString('fr-FR')}):\n${c.content}`)
      .join('\n\n');

    const userPrompt = `Article : "${article.title}"

Type de ressource : ${article.resource_type}

Commentaires des utilisateurs (${comments.length} derniers commentaires) :

${commentsText}

Analyse ces commentaires et génère une FAQ pertinente basée sur les préoccupations réelles des lecteurs.`;

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No content generated");
    }

    // Clean and parse JSON
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const suggestedQuestions = JSON.parse(cleanedText);

    // Validate structure
    if (!Array.isArray(suggestedQuestions) || suggestedQuestions.length === 0) {
      throw new Error("Invalid FAQ format");
    }

    // Filtrer les questions avec frequency >= 2
    const relevantQuestions = suggestedQuestions.filter((q: any) => q.frequency >= 2);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggested_questions: relevantQuestions,
        total_comments_analyzed: comments.length,
        lookback_days
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error in analyze-comments-for-faq:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
