import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 100;
const CONCURRENCY = 15; // Parallel AI calls
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface ScoringResult {
  score: number;
  details: {
    completude: number;
    secteur: number;
    taille: number;
    localisation: number;
    signaux: number;
  };
  recommendation: string;
}

async function scoreVivier(vivier: Record<string, unknown>, systemPrompt: string): Promise<ScoringResult> {
  const vivierContext = `
Entreprise: ${vivier.company_name || 'Non renseigné'}
Email: ${vivier.email || 'Non renseigné'}
Téléphone: ${vivier.phone || 'Non renseigné'}
SIRET: ${vivier.siret || 'Non renseigné'}
Secteur: ${vivier.industry || 'Non renseigné'}
Effectif: ${vivier.employee_count || vivier.company_size || 'Non renseigné'}
Ville: ${vivier.city || 'Non renseigné'}
Région: ${vivier.region || 'Non renseigné'}
Site web: ${vivier.website || 'Non renseigné'}
LinkedIn: ${vivier.linkedin_url || 'Non renseigné'}
CA: ${vivier.revenue_range || 'Non renseigné'}
Date création: ${vivier.creation_date || 'Non renseigné'}
  `.trim();

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Score ce prospect:\n\n${vivierContext}` }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_score',
            description: 'Submit the scoring result for this prospect',
            parameters: {
              type: 'object',
              properties: {
                score: { type: 'number', description: 'Score global de 0 à 100' },
                details: {
                  type: 'object',
                  properties: {
                    completude: { type: 'number' },
                    secteur: { type: 'number' },
                    taille: { type: 'number' },
                    localisation: { type: 'number' },
                    signaux: { type: 'number' },
                  },
                  required: ['completude', 'secteur', 'taille', 'localisation', 'signaux'],
                },
                recommendation: { type: 'string', description: 'Courte recommandation action' },
              },
              required: ['score', 'details', 'recommendation'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'submit_score' } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error('No tool call in response');
  }

  return JSON.parse(toolCall.function.arguments) as ScoringResult;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batch_size = BATCH_SIZE, vivier_ids, min_score, max_score, rescore = false } = await req.json();

    // Fetch the scoring prompt
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('slug', 'vivier-score')
      .single();

    if (promptError || !promptData) {
      throw new Error('Scoring prompt not found');
    }

    const systemPrompt = promptData.system_prompt;
    const batchId = crypto.randomUUID();

    // Build query for viviers to score
    let query = supabase
      .from('viviers')
      .select('id, company_name, email, phone, siret, industry, employee_count, company_size, city, region, website, linkedin_url, revenue_range, creation_date')
      .neq('status', 'promoted')
      .order('created_at', { ascending: false })
      .limit(batch_size);

    // If specific IDs provided
    if (vivier_ids && Array.isArray(vivier_ids) && vivier_ids.length > 0) {
      query = query.in('id', vivier_ids);
    } else if (!rescore) {
      // Only unscored viviers
      query = query.is('cold_score', null);
    }

    // Optional score filters for rescoring
    if (min_score !== undefined) {
      query = query.gte('cold_score', min_score);
    }
    if (max_score !== undefined) {
      query = query.lte('cold_score', max_score);
    }

    const { data: viviers, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!viviers || viviers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        batch_id: batchId,
        scored: 0,
        message: 'No viviers to score',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Scoring batch ${batchId}: ${viviers.length} viviers`);

    const results = {
      scored: 0,
      errors: 0,
      details: [] as { id: string; score: number; success: boolean }[],
    };

    // Process viviers in parallel with higher concurrency
    for (let i = 0; i < viviers.length; i += CONCURRENCY) {
      const chunk = viviers.slice(i, i + CONCURRENCY);
      
      await Promise.all(chunk.map(async (vivier) => {
        try {
          const scoring = await scoreVivier(vivier, systemPrompt);
          
          // Update vivier with score
          const { error: updateError } = await supabase
            .from('viviers')
            .update({
              cold_score: scoring.score,
              scoring_criteria: scoring.details,
              scoring_batch_id: batchId,
              scored_at: new Date().toISOString(),
              status: scoring.score >= 60 ? 'qualified' : 'scoring',
              notes: scoring.recommendation,
              updated_at: new Date().toISOString(),
            })
            .eq('id', vivier.id);

          if (updateError) {
            console.error(`Update error for ${vivier.id}:`, updateError);
            results.errors++;
            results.details.push({ id: vivier.id, score: 0, success: false });
          } else {
            results.scored++;
            results.details.push({ id: vivier.id, score: scoring.score, success: true });
            console.log(`Scored ${vivier.company_name || vivier.email}: ${scoring.score}`);
          }
        } catch (err) {
          console.error(`Scoring error for ${vivier.id}:`, err);
          results.errors++;
          results.details.push({ id: vivier.id, score: 0, success: false });
        }
      }));
    }

    console.log(`Batch ${batchId} complete: ${results.scored} scored, ${results.errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      batch_id: batchId,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in score-viviers-batch:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
