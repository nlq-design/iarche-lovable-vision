import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractStructured } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// V3: Extended search filters with email domains, exclusions, text search
interface SearchFiltersV3 {
  // Text search
  search?: string;
  searchText?: string;
  searchInFields?: string[];
  
  // Email filters
  emailDomain?: string;
  emailDomainContains?: string;
  excludeEmailDomains?: string[];
  
  // Location
  city?: string;
  postalCodePrefix?: string | string[];
  excludeCities?: string[];
  
  // Company
  industry?: string;
  industryContains?: string;
  excludeIndustry?: string[];
  nafCode?: string;
  legalForm?: string;
  companySize?: string;
  revenueRange?: string;
  minEmployees?: number;
  maxEmployees?: number;
  createdAfter?: string;
  
  // Contact
  contactPosition?: string;
  hasContactName?: boolean;
  hasCompanyName?: boolean;
  
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

interface AIResponseV3 {
  filters: SearchFiltersV3;
  confidence: number;
  interpretation: string;
  clarification?: string | null;
}

function sanitizeSearchInput(input: string | undefined, maxLength = 200): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed.replace(/[%_]/g, '\\$&');
}

const FILTER_SCHEMA = {
  name: 'apply_filters',
  description: 'Apply search filters based on natural language query - V3',
  parameters: {
    type: 'object',
    properties: {
      filters: {
        type: 'object',
        properties: {
          // Text search
          searchText: { type: 'string', description: 'Texte libre à chercher dans company_name et industry' },
          searchInFields: { type: 'array', items: { type: 'string' }, description: 'Champs où chercher: company_name, industry, contact_name' },
          
          // Email
          emailDomain: { type: 'string', description: 'Domaine email exact (gmail.com, notaires.fr)' },
          emailDomainContains: { type: 'string', description: 'Domaine contient (ac- pour académiques)' },
          excludeEmailDomains: { type: 'array', items: { type: 'string' }, description: 'Domaines à exclure (webmails)' },
          
          // Location
          city: { type: 'string', description: 'Ville exacte' },
          postalCodePrefix: { 
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ],
            description: 'Préfixe(s) code postal / département (33, 75, ["75","77","78"])'
          },
          excludeCities: { type: 'array', items: { type: 'string' }, description: 'Villes à exclure' },
          
          // Company
          industry: { type: 'string', description: 'Secteur exact EN MAJUSCULES (AGENCES IMMOBILIERES)' },
          industryContains: { type: 'string', description: 'Secteur contient (ECOLES, ASSOCIATIONS)' },
          excludeIndustry: { type: 'array', items: { type: 'string' }, description: 'Secteurs à exclure EN MAJUSCULES' },
          nafCode: { type: 'string', description: 'Préfixe code NAF (68 pour immo, 56 pour resto)' },
          legalForm: { type: 'string', description: 'Forme juridique (SARL, SAS, SA)' },
          minEmployees: { type: 'number', description: 'Effectif minimum' },
          maxEmployees: { type: 'number', description: 'Effectif maximum' },
          
          // Contact
          contactPosition: { type: 'string', description: 'Fonction (DG, CEO, décideur)' },
          hasContactName: { type: 'boolean', description: 'Contact nommé' },
          hasCompanyName: { type: 'boolean', description: 'Entreprise identifiée' },
          
          // Scoring
          minScore: { type: 'number', description: 'Score minimum 0-100' },
          maxScore: { type: 'number', description: 'Score maximum 0-100' },
          status: { type: 'string', description: 'Statut (new, qualified, contacted, promoted)' },
          
          // Data presence
          hasEmail: { type: 'boolean' },
          hasPhone: { type: 'boolean' },
          hasSiret: { type: 'boolean' },
          
          // Campaign
          campaignEligible: { type: 'boolean', description: 'Éligible campagne' },
          source: { type: 'string' },
        },
      },
      interpretation: { type: 'string', description: 'Explication courte des filtres en français' },
      confidence: { type: 'number', description: 'Confiance 0-100' },
      clarification: { type: 'string', description: 'Question si requête ambiguë, sinon null' },
    },
    required: ['filters', 'interpretation', 'confidence'],
  },
};

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

    // Fetch the V3 prompt
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('system_prompt')
      .eq('slug', 'vivier-target')
      .single();

    if (!promptData?.system_prompt) {
      throw new Error('Prompt vivier-target not found in database');
    }

    // Use centralized AI client with automatic DB config lookup
    const parsed = await extractStructured<AIResponseV3>(
      [
        { role: 'system', content: promptData.system_prompt },
        { role: 'user', content: `Analyse cette requête de ciblage prospect et extrait les filtres JSON:\n\n"${userQuery}"\n\nContexte filtres existants: ${JSON.stringify(existingFilters || {})}` }
      ],
      FILTER_SCHEMA,
      { functionName: 'vivier-ai-search' }
    );

    if (!parsed) {
      throw new Error('Échec de l\'analyse de la requête');
    }

    const filters = parsed.filters || {};
    const interpretation = parsed.interpretation || '';
    const confidence = parsed.confidence || 80;
    const clarification = parsed.clarification || null;

    console.log('AI V3 filters:', JSON.stringify(filters), 'confidence:', confidence);

    // V3: Build optimized query
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

    // ==================== V3 FILTERS ====================

    // EMAIL DOMAIN FILTERS
    if (filters.emailDomain) {
      const domain = sanitizeSearchInput(filters.emailDomain, 100);
      if (domain) {
        dbQuery = dbQuery.ilike('email', `%@${domain}`);
      }
    }
    if (filters.emailDomainContains) {
      const contains = sanitizeSearchInput(filters.emailDomainContains, 50);
      if (contains) {
        dbQuery = dbQuery.ilike('email', `%@%${contains}%`);
      }
    }
    if (filters.excludeEmailDomains && filters.excludeEmailDomains.length > 0) {
      for (const domain of filters.excludeEmailDomains.slice(0, 15)) {
        const d = sanitizeSearchInput(domain, 100);
        if (d) {
          dbQuery = dbQuery.not('email', 'ilike', `%@${d}`);
        }
      }
    }

    // TEXT SEARCH
    if (filters.searchText) {
      const s = sanitizeSearchInput(filters.searchText);
      if (s) {
        const fields = filters.searchInFields?.length 
          ? filters.searchInFields 
          : ['company_name', 'industry'];
        const orConditions = fields.map(f => `${f}.ilike.%${s}%`).join(',');
        dbQuery = dbQuery.or(orConditions);
      }
    }

    // LOCATION FILTERS
    if (filters.city) {
      const s = sanitizeSearchInput(filters.city);
      if (s) dbQuery = dbQuery.ilike('city', `%${s}%`);
    }
    if (filters.postalCodePrefix) {
      const prefixes = Array.isArray(filters.postalCodePrefix) 
        ? filters.postalCodePrefix 
        : [filters.postalCodePrefix];
      if (prefixes.length === 1) {
        const p = sanitizeSearchInput(prefixes[0], 10);
        if (p) dbQuery = dbQuery.ilike('postal_code', `${p}%`);
      } else if (prefixes.length > 1) {
        const orConditions = prefixes
          .map(p => sanitizeSearchInput(p, 10))
          .filter(Boolean)
          .map(p => `postal_code.ilike.${p}%`)
          .join(',');
        if (orConditions) dbQuery = dbQuery.or(orConditions);
      }
    }
    if (filters.excludeCities && filters.excludeCities.length > 0) {
      for (const city of filters.excludeCities.slice(0, 10)) {
        const c = sanitizeSearchInput(city);
        if (c) dbQuery = dbQuery.not('city', 'ilike', `%${c}%`);
      }
    }

    // INDUSTRY FILTERS
    if (filters.industry) {
      const s = sanitizeSearchInput(filters.industry);
      if (s) dbQuery = dbQuery.ilike('industry', `%${s}%`);
    }
    if (filters.industryContains) {
      const s = sanitizeSearchInput(filters.industryContains);
      if (s) dbQuery = dbQuery.ilike('industry', `%${s}%`);
    }
    if (filters.excludeIndustry && filters.excludeIndustry.length > 0) {
      for (const ind of filters.excludeIndustry.slice(0, 10)) {
        const i = sanitizeSearchInput(ind);
        if (i) dbQuery = dbQuery.not('industry', 'ilike', `%${i}%`);
      }
    }
    if (filters.nafCode) {
      const s = sanitizeSearchInput(filters.nafCode, 10);
      if (s) dbQuery = dbQuery.ilike('naf_code', `${s}%`);
    }
    if (filters.legalForm) {
      const s = sanitizeSearchInput(filters.legalForm, 50);
      if (s) dbQuery = dbQuery.ilike('legal_form', `%${s}%`);
    }

    // EMPLOYEE FILTERS
    if (filters.minEmployees !== undefined) {
      dbQuery = dbQuery.gte('employee_count', filters.minEmployees);
    }
    if (filters.maxEmployees !== undefined) {
      dbQuery = dbQuery.lte('employee_count', filters.maxEmployees);
    }

    // CONTACT FILTERS
    if (filters.contactPosition) {
      const s = sanitizeSearchInput(filters.contactPosition);
      if (s) {
        if (s.toLowerCase().includes('décideur') || s.toLowerCase().includes('decideur')) {
          dbQuery = dbQuery.or('contact_position.ilike.%DG%,contact_position.ilike.%CEO%,contact_position.ilike.%Directeur%,contact_position.ilike.%Gérant%,contact_position.ilike.%Président%');
        } else {
          dbQuery = dbQuery.ilike('contact_position', `%${s}%`);
        }
      }
    }
    if (filters.hasContactName === true) {
      dbQuery = dbQuery.not('contact_name', 'is', null).neq('contact_name', '');
    }
    if (filters.hasCompanyName === true) {
      dbQuery = dbQuery.not('company_name', 'is', null).neq('company_name', '');
    }

    // SCORING FILTERS
    if (filters.minScore !== undefined) {
      dbQuery = dbQuery.gte('cold_score', filters.minScore);
    }
    if (filters.maxScore !== undefined) {
      dbQuery = dbQuery.lte('cold_score', filters.maxScore);
    }
    if (filters.status) {
      dbQuery = dbQuery.eq('status', filters.status);
    }

    // DATA PRESENCE FILTERS
    if (filters.hasEmail === true) {
      dbQuery = dbQuery.not('email', 'is', null).neq('email', '');
    }
    if (filters.hasPhone === true) {
      dbQuery = dbQuery.not('phone', 'is', null).neq('phone', '');
    }
    if (filters.hasSiret === true) {
      dbQuery = dbQuery.not('siret', 'is', null).neq('siret', '');
    }

    // CAMPAIGN ELIGIBILITY
    if (filters.campaignEligible === true) {
      dbQuery = dbQuery
        .or('consent_marketing.eq.true,consent_marketing.is.null')
        .is('unsubscribed_at', null);
    }

    // SOURCE FILTER
    if (filters.source) {
      const s = sanitizeSearchInput(filters.source, 50);
      if (s) dbQuery = dbQuery.ilike('source', `%${s}%`);
    }

    const { data: results, error: queryError, count } = await dbQuery;

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    // Calculate stats
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
      interpretation,
      confidence,
      clarification,
      results: results || [],
      totalCount: count || 0,
      stats,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vivier-ai-search V3:', error);
    
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    let statusCode = 500;
    
    if (message.includes('rate_limit') || message.includes('429')) {
      statusCode = 429;
    } else if (message.includes('402') || message.includes('quota')) {
      statusCode = 402;
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
