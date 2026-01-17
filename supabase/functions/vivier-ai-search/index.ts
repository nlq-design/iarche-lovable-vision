import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// V2: Extended search filters covering all vivier columns
interface SearchFiltersV2 {
  // Text search
  search?: string;
  // Location
  city?: string;
  postalCode?: string;
  region?: string;
  country?: string;
  // Company
  industry?: string;
  nafCode?: string;
  legalForm?: string;
  companySize?: string;
  revenueRange?: string;
  minEmployees?: number;
  maxEmployees?: number;
  createdAfter?: string; // Company creation date
  // Contact
  contactPosition?: string;
  // Scoring
  minScore?: number;
  maxScore?: number;
  status?: string;
  // Data presence
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasSiret?: boolean;
  hasWebsite?: boolean;
  hasLinkedin?: boolean;
  // Campaign eligibility
  campaignEligible?: boolean;
  source?: string;
  tags?: string[];
}

/**
 * Sanitizes search input for Supabase ILIKE queries
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

    const { query: userQuery, limit = 100, existingFilters } = await req.json();

    if (!userQuery || typeof userQuery !== 'string') {
      return new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the targeting prompt from database
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('slug', 'vivier-target')
      .single();

    if (!promptData?.system_prompt) {
      throw new Error('Prompt vivier-target not found in database');
    }

    // V2: Extended tool schema with all filters
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: promptData.system_prompt },
          { role: 'user', content: `Analyse cette requête de ciblage prospect et extrait les filtres:\n\n"${userQuery}"\n\nContexte filtres existants: ${JSON.stringify(existingFilters || {})}` }
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
                      // Text search
                      search: { type: 'string', description: 'Recherche textuelle libre (nom, email, entreprise)' },
                      // Location
                      city: { type: 'string', description: 'Ville (ex: Paris, Bordeaux)' },
                      postalCode: { type: 'string', description: 'Code postal ou préfixe département (ex: 75, 33, 69001)' },
                      region: { type: 'string', description: 'Région (ex: Île-de-France, Nouvelle-Aquitaine)' },
                      country: { type: 'string', description: 'Pays (défaut: France)' },
                      // Company
                      industry: { type: 'string', description: 'Secteur activité texte libre (immobilier, IT, conseil...)' },
                      nafCode: { type: 'string', description: 'Code NAF/APE précis (ex: 6201Z, 68)' },
                      legalForm: { type: 'string', description: 'Forme juridique (SARL, SAS, SA, EURL, Auto-entrepreneur)' },
                      companySize: { type: 'string', description: 'Taille entreprise (TPE, PME, ETI, GE)' },
                      revenueRange: { type: 'string', description: 'Tranche CA (ex: 1-10M€)' },
                      minEmployees: { type: 'number', description: 'Effectif minimum' },
                      maxEmployees: { type: 'number', description: 'Effectif maximum' },
                      createdAfter: { type: 'string', description: 'Entreprise créée après (format YYYY-MM-DD)' },
                      // Contact
                      contactPosition: { type: 'string', description: 'Fonction contact (DG, CEO, DSI, DAF, Gérant, Directeur, décideur)' },
                      // Scoring
                      minScore: { type: 'number', description: 'Score minimum (0-100)' },
                      maxScore: { type: 'number', description: 'Score maximum (0-100)' },
                      status: { type: 'string', description: 'Statut (new, qualified, contacted, promoted)' },
                      // Data presence
                      hasEmail: { type: 'boolean', description: 'Email renseigné' },
                      hasPhone: { type: 'boolean', description: 'Téléphone renseigné' },
                      hasSiret: { type: 'boolean', description: 'SIRET renseigné' },
                      hasWebsite: { type: 'boolean', description: 'Site web renseigné' },
                      hasLinkedin: { type: 'boolean', description: 'LinkedIn renseigné' },
                      // Campaign
                      campaignEligible: { type: 'boolean', description: 'Éligible campagne (consentement OK, non désinscrit)' },
                      source: { type: 'string', description: 'Source du lead (import, lemlist)' },
                      tags: { type: 'array', items: { type: 'string' }, description: 'Tags spécifiques' },
                    },
                  },
                  explanation: { type: 'string', description: 'Explication courte des filtres appliqués en français' },
                  estimatedIntent: { type: 'string', description: 'Intention détectée (prospection, ciblage, nettoyage, analyse, export)' },
                  confidence: { type: 'number', description: 'Confiance dans l\'interprétation (0-100)' },
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
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA épuisés' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('Échec de l\'analyse de la requête');
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const filters: SearchFiltersV2 = parsed.filters || {};
    const explanation = parsed.explanation || '';
    const intent = parsed.estimatedIntent || 'ciblage';
    const confidence = parsed.confidence || 80;

    console.log('AI parsed filters V2:', JSON.stringify(filters), 'confidence:', confidence);

    // V2: Build query with extended columns for preview
    let dbQuery = supabase
      .from('viviers')
      .select(`
        id, slug, company_name, contact_name, contact_first_name, contact_last_name,
        contact_position, email, phone, city, postal_code, region, industry,
        naf_code, legal_form, company_size, cold_score, status, employee_count,
        siret, website, linkedin_url, tags, source, consent_marketing, unsubscribed_at,
        creation_date, created_at
      `, { count: 'exact' })
      .or('status.neq.promoted,status.is.null')
      .order('cold_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    // ==================== APPLY FILTERS ====================

    // Text search
    if (filters.search) {
      const s = sanitizeSearchInput(filters.search);
      if (s) {
        dbQuery = dbQuery.or(`company_name.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%`);
      }
    }

    // Location filters
    if (filters.city) {
      const s = sanitizeSearchInput(filters.city);
      if (s) dbQuery = dbQuery.ilike('city', `%${s}%`);
    }
    if (filters.postalCode) {
      const s = sanitizeSearchInput(filters.postalCode, 10);
      if (s) dbQuery = dbQuery.ilike('postal_code', `${s}%`);
    }
    if (filters.region) {
      const s = sanitizeSearchInput(filters.region);
      if (s) dbQuery = dbQuery.ilike('region', `%${s}%`);
    }
    if (filters.country) {
      const s = sanitizeSearchInput(filters.country);
      if (s) dbQuery = dbQuery.ilike('country', `%${s}%`);
    }

    // Company filters
    if (filters.industry) {
      const s = sanitizeSearchInput(filters.industry);
      if (s) dbQuery = dbQuery.ilike('industry', `%${s}%`);
    }
    if (filters.nafCode) {
      const s = sanitizeSearchInput(filters.nafCode, 10);
      if (s) dbQuery = dbQuery.ilike('naf_code', `${s}%`);
    }
    if (filters.legalForm) {
      const s = sanitizeSearchInput(filters.legalForm, 50);
      if (s) dbQuery = dbQuery.ilike('legal_form', `%${s}%`);
    }
    if (filters.companySize) {
      const s = sanitizeSearchInput(filters.companySize, 20);
      if (s) dbQuery = dbQuery.ilike('company_size', `%${s}%`);
    }
    if (filters.revenueRange) {
      const s = sanitizeSearchInput(filters.revenueRange, 50);
      if (s) dbQuery = dbQuery.ilike('revenue_range', `%${s}%`);
    }
    if (filters.minEmployees !== undefined) {
      dbQuery = dbQuery.gte('employee_count', filters.minEmployees);
    }
    if (filters.maxEmployees !== undefined) {
      dbQuery = dbQuery.lte('employee_count', filters.maxEmployees);
    }
    if (filters.createdAfter) {
      dbQuery = dbQuery.gte('creation_date', filters.createdAfter);
    }

    // Contact filters
    if (filters.contactPosition) {
      const s = sanitizeSearchInput(filters.contactPosition);
      if (s) {
        // Handle "décideur" as multiple positions
        if (s.toLowerCase().includes('décideur') || s.toLowerCase().includes('decideur')) {
          dbQuery = dbQuery.or('contact_position.ilike.%DG%,contact_position.ilike.%CEO%,contact_position.ilike.%Directeur%,contact_position.ilike.%Gérant%,contact_position.ilike.%Président%');
        } else {
          dbQuery = dbQuery.ilike('contact_position', `%${s}%`);
        }
      }
    }

    // Scoring filters
    if (filters.minScore !== undefined) {
      dbQuery = dbQuery.gte('cold_score', filters.minScore);
    }
    if (filters.maxScore !== undefined) {
      dbQuery = dbQuery.lte('cold_score', filters.maxScore);
    }
    if (filters.status) {
      dbQuery = dbQuery.eq('status', filters.status);
    }

    // Data presence filters
    if (filters.hasEmail === true) {
      dbQuery = dbQuery.not('email', 'is', null).neq('email', '');
    }
    if (filters.hasPhone === true) {
      dbQuery = dbQuery.not('phone', 'is', null).neq('phone', '');
    }
    if (filters.hasSiret === true) {
      dbQuery = dbQuery.not('siret', 'is', null).neq('siret', '');
    }
    if (filters.hasWebsite === true) {
      dbQuery = dbQuery.not('website', 'is', null).neq('website', '');
    }
    if (filters.hasLinkedin === true) {
      dbQuery = dbQuery.not('linkedin_url', 'is', null).neq('linkedin_url', '');
    }

    // Campaign eligibility
    if (filters.campaignEligible === true) {
      dbQuery = dbQuery
        .or('consent_marketing.eq.true,consent_marketing.is.null')
        .is('unsubscribed_at', null);
    }

    // Source filter
    if (filters.source) {
      const s = sanitizeSearchInput(filters.source, 50);
      if (s) dbQuery = dbQuery.ilike('source', `%${s}%`);
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      dbQuery = dbQuery.contains('tags', filters.tags);
    }

    const { data: results, error: queryError, count } = await dbQuery;

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    // Calculate data quality stats for results
    const stats = {
      withEmail: results?.filter(r => r.email)?.length || 0,
      withPhone: results?.filter(r => r.phone)?.length || 0,
      withSiret: results?.filter(r => r.siret)?.length || 0,
      avgScore: results?.length 
        ? Math.round(results.reduce((sum, r) => sum + (r.cold_score || 0), 0) / results.length)
        : 0,
      campaignReady: results?.filter(r => 
        r.email && 
        (r.consent_marketing !== false) && 
        !r.unsubscribed_at
      )?.length || 0,
    };

    return new Response(JSON.stringify({
      success: true,
      query: userQuery,
      filters,
      explanation,
      intent,
      confidence,
      results: results || [],
      totalCount: count || 0,
      stats,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vivier-ai-search V2:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
