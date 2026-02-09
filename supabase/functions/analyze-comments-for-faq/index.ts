import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  article_id: string;
  lookback_days?: number;
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

    const prompt = await loadPrompt(supabase, "content-comments-faq", {
      system_prompt: `Tu es un expert en analyse de contenu et génération de FAQ.
Analyse les commentaires pour identifier questions implicites et préoccupations récurrentes.
Règles : questions du LECTEUR, réponses courtes (2-3 phrases), ignorer spam.
Génère 3-6 questions. Format JSON : [{"question": "...", "answer": "...", "frequency": 1-5}]`
    });

    const commentsText = comments
      .map((c, i) => `Commentaire ${i + 1} (${c.author_name}, ${new Date(c.created_at).toLocaleDateString('fr-FR')}):\n${c.content}`)
      .join('\n\n');

    const userPrompt = `Article : "${article.title}"

Type de ressource : ${article.resource_type}

Commentaires des utilisateurs (${comments.length} derniers commentaires) :

${commentsText}

Analyse ces commentaires et génère une FAQ pertinente basée sur les préoccupations réelles des lecteurs.`;

    // Use centralized AI client with automatic DB config lookup
    const generatedText = await callLLM(
      [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: userPrompt }
      ],
      { functionName: 'analyze-comments-for-faq' }
    );

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
    
    const message = (error as Error).message || 'Unknown error';
    let statusCode = 500;
    
    if (message.includes('rate_limit') || message.includes('429')) {
      statusCode = 429;
    } else if (message.includes('402') || message.includes('quota')) {
      statusCode = 402;
    }
    
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
