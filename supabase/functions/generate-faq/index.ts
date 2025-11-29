import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Determine number of questions based on resource_type and mode
    const questionCount = mode === 'add' ? 3 : (resource_type === 'actualite' ? 3 : 5);

    // Construct empathetic prompt
    const modeInstruction = mode === 'add' 
      ? `Questions déjà existantes (NE PAS LES DUPLIQUER) :\n${existing_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nGénère ${questionCount} NOUVELLES questions différentes qui complètent les questions existantes.`
      : `Génère exactement ${questionCount} questions.`;

    const systemPrompt = `Tu es un expert en IA appliquée aux PME françaises.
Génère une FAQ empathique pour cet article.

Règles strictes :
- Questions formulées du point de vue du LECTEUR (pas de l'auteur)
- Ton : rassurant, pédagogique, sans jargon technique
- Anticipe les VRAIES préoccupations (coût, complexité, temps, risques)
- Réponses courtes (2-3 phrases max)
- Inclure obligatoirement 1 question sur "Par où commencer ?" ou "Est-ce adapté à mon entreprise ?"

${modeInstruction}

Format de réponse UNIQUEMENT en JSON :
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]`;

    const userPrompt = `Titre de l'article : ${title}

Contenu de l'article :
${content.substring(0, 3000)}

Type de ressource : ${resource_type}`;

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
      throw new Error(`AI generation failed: ${response.status}`);
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

    const questions = JSON.parse(cleanedText);

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid FAQ format");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle mode: new vs add
    let finalQuestions = questions;
    
    if (mode === 'add') {
      // Récupérer FAQ existante et merger les questions
      const { data: existingFaq } = await supabase
        .from('faqs')
        .select('questions')
        .eq('article_id', article_id)
        .maybeSingle();
      
      if (existingFaq && existingFaq.questions) {
        const existingQuestionsArray = existingFaq.questions as any[];
        finalQuestions = [...existingQuestionsArray, ...questions];
      }
    }

    // Upsert FAQ
    const { data: faqData, error: faqError } = await supabase
      .from('faqs')
      .upsert({
        article_id,
        questions: finalQuestions,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'article_id'
      })
      .select()
      .single();

    if (faqError) {
      console.error("Supabase error:", faqError);
      throw new Error(`Failed to save FAQ: ${faqError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        faq: faqData,
        questions 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error in generate-faq:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
