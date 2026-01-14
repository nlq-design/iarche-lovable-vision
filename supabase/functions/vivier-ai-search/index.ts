import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface SearchFilters {
  search?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  industry?: string;
  minScore?: number;
  maxScore?: number;
  minEmployees?: number;
  maxEmployees?: number;
  status?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasSiret?: boolean;
}

// =============================================================================
// INPUT SANITIZATION FOR SEARCH QUERIES
// =============================================================================

/**
 * Sanitizes search input for Supabase ILIKE queries
 * - Escapes SQL wildcards (%, _) to prevent wildcard injection
 * - Limits length to prevent performance issues
 * - Trims whitespace
 */
function sanitizeSearchInput(input: string | undefined, maxLength = 200): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed.replace(/[%_]/g, '\\$&');
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

    const { query: userQuery, limit = 100 } = await req.json();

    if (!userQuery || typeof userQuery !== 'string') {
      return new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the targeting prompt
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('slug', 'vivier-target')
      .single();

    const systemPrompt = promptData?.system_prompt || `Tu es un expert en segmentation commerciale B2B.
Analyse la requête utilisateur et génère les critères de filtrage.
Critères disponibles: search, city, postalCode, region, industry, minScore, maxScore, minEmployees, maxEmployees, status, hasEmail, hasPhone, hasSiret.
Retourne un JSON avec les filtres applicables.`;

    // Call AI to parse natural language query
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyse cette requête de ciblage prospect et extrait les filtres:\n\n"${userQuery}"` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'apply_filters',
              description: 'Apply search filters based on natural language query',
              parameters: {
                type: 'object',
                properties: {
                  filters: {
                    type: 'object',
                    properties: {
                      search: { type: 'string', description: 'Recherche textuelle (nom, email, entreprise)' },
                      city: { type: 'string', description: 'Ville' },
                      postalCode: { type: 'string', description: 'Code postal ou préfixe département (ex: 75, 33)' },
                      region: { type: 'string', description: 'Région (ex: Île-de-France)' },
                      industry: { type: 'string', description: 'Secteur activité' },
                      minScore: { type: 'number', description: 'Score minimum (0-100)' },
                      maxScore: { type: 'number', description: 'Score maximum (0-100)' },
                      minEmployees: { type: 'number', description: 'Effectif minimum' },
                      maxEmployees: { type: 'number', description: 'Effectif maximum' },
                      status: { type: 'string', description: 'Statut (new, qualified, contacted, promoted)' },
                      hasEmail: { type: 'boolean', description: 'Email renseigné' },
                      hasPhone: { type: 'boolean', description: 'Téléphone renseigné' },
                      hasSiret: { type: 'boolean', description: 'SIRET renseigné' },
                    },
                  },
                  explanation: { type: 'string', description: 'Explication courte des filtres appliqués' },
                  estimatedIntent: { type: 'string', description: 'Intention détectée (prospection, ciblage, nettoyage, etc.)' },
                },
                required: ['filters', 'explanation'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'apply_filters' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('Failed to parse query');
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const filters: SearchFilters = parsed.filters || {};
    const explanation = parsed.explanation || '';
    const intent = parsed.estimatedIntent || 'ciblage';

    console.log('AI parsed filters:', filters, 'explanation:', explanation);

    // Build Supabase query
    let dbQuery = supabase
      .from('viviers')
      .select('id, company_name, contact_name, email, phone, city, postal_code, region, industry, cold_score, status, employee_count, siret', { count: 'exact' })
      .neq('status', 'promoted')
      .order('cold_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    // Apply filters with sanitized inputs
    if (filters.search) {
      const sanitizedSearch = sanitizeSearchInput(filters.search);
      if (sanitizedSearch) {
        dbQuery = dbQuery.or(`company_name.ilike.%${sanitizedSearch}%,contact_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`);
      }
    }
    if (filters.city) {
      const sanitizedCity = sanitizeSearchInput(filters.city);
      if (sanitizedCity) {
        dbQuery = dbQuery.ilike('city', `%${sanitizedCity}%`);
      }
    }
    if (filters.postalCode) {
      const sanitizedPostal = sanitizeSearchInput(filters.postalCode, 10);
      if (sanitizedPostal) {
        dbQuery = dbQuery.ilike('postal_code', `${sanitizedPostal}%`);
      }
    }
    if (filters.region) {
      const sanitizedRegion = sanitizeSearchInput(filters.region);
      if (sanitizedRegion) {
        dbQuery = dbQuery.ilike('region', `%${sanitizedRegion}%`);
      }
    }
    if (filters.industry) {
      const sanitizedIndustry = sanitizeSearchInput(filters.industry);
      if (sanitizedIndustry) {
        dbQuery = dbQuery.ilike('industry', `%${sanitizedIndustry}%`);
      }
    }
    if (filters.minScore !== undefined) {
      dbQuery = dbQuery.gte('cold_score', filters.minScore);
    }
    if (filters.maxScore !== undefined) {
      dbQuery = dbQuery.lte('cold_score', filters.maxScore);
    }
    if (filters.minEmployees !== undefined) {
      dbQuery = dbQuery.gte('employee_count', filters.minEmployees);
    }
    if (filters.maxEmployees !== undefined) {
      dbQuery = dbQuery.lte('employee_count', filters.maxEmployees);
    }
    if (filters.status) {
      dbQuery = dbQuery.eq('status', filters.status);
    }
    if (filters.hasEmail === true) {
      dbQuery = dbQuery.not('email', 'is', null);
    }
    if (filters.hasPhone === true) {
      dbQuery = dbQuery.not('phone', 'is', null);
    }
    if (filters.hasSiret === true) {
      dbQuery = dbQuery.not('siret', 'is', null);
    }

    const { data: results, error: queryError, count } = await dbQuery;

    if (queryError) {
      throw queryError;
    }

    return new Response(JSON.stringify({
      success: true,
      query: userQuery,
      filters,
      explanation,
      intent,
      results: results || [],
      totalCount: count || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vivier-ai-search:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
