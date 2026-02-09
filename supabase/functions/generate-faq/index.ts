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
  title: string;
  content: string;
  resource_type: string;
  mode?: 'new' | 'add';
  existing_questions?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id, title, content, resource_type, mode = 'new', existing_questions = [] }: RequestBody = await req.json();

    if (!article_id || !title || !content || !resource_type) {
      throw new Error('Missing required fields');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const prompt = await loadPrompt(supabase, "content-faq", {
      system_prompt: `Tu es un expert en IA appliquée aux PME françaises.
Génère une FAQ empathique pour cet article.

Règles strictes :
- Questions formulées du point de vue du LECTEUR
- Ton rassurant, pédagogique, sans jargon technique
- Anticipe les VRAIES préoccupations (coût, complexité, temps, risques)
- Réponses courtes (2-3 phrases max)
- Inclure 1 question sur "Par où commencer ?" ou "Est-ce adapté à mon entreprise ?"

Format de réponse UNIQUEMENT en JSON :
[{"question": "...", "answer": "..."}]`
    });

    const questionCount = mode === 'add' ? 3 : (resource_type === 'actualite' ? 3 : 5);
    const modeInstruction = mode === 'add' 
      ? `Questions existantes (NE PAS DUPLIQUER) :\n${existing_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nGénère ${questionCount} NOUVELLES questions.`
      : `Génère exactement ${questionCount} questions.`;

    const userPrompt = `${modeInstruction}

Titre : ${title}
Type : ${resource_type}
Contenu : ${content.substring(0, 3000)}`;

    const generatedText = await callLLM(
      [
        { role: 'system', content: prompt.system_prompt + '\n\n' + modeInstruction },
        { role: 'user', content: userPrompt }
      ],
      { functionName: 'generate-faq' }
    );

    if (!generatedText) throw new Error("No content generated");

    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    else if (cleanedText.startsWith("```")) cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');

    const questions = JSON.parse(cleanedText);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error("Invalid FAQ format");

    let finalQuestions = questions;
    if (mode === 'add') {
      const { data: existingFaq } = await supabase.from('faqs').select('questions').eq('article_id', article_id).maybeSingle();
      if (existingFaq?.questions) {
        finalQuestions = [...(existingFaq.questions as any[]), ...questions];
      }
    }

    const { data: faqData, error: faqError } = await supabase
      .from('faqs')
      .upsert({ article_id, questions: finalQuestions, updated_at: new Date().toISOString() }, { onConflict: 'article_id' })
      .select().single();

    if (faqError) throw new Error(`Failed to save FAQ: ${faqError.message}`);

    return new Response(JSON.stringify({ success: true, faq: faqData, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-faq:", error);
    const message = (error as Error).message || 'Unknown error';
    let statusCode = 500;
    if (message.includes('rate_limit') || message.includes('429')) statusCode = 429;
    else if (message.includes('402') || message.includes('quota')) statusCode = 402;
    
    return new Response(JSON.stringify({ error: message }), {
      status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
