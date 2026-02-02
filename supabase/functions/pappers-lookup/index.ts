import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAPICallTracker, checkAPIQuota, APIQuotaExceededError } from "../_shared/api-tracker.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAPPERS_API_KEY = Deno.env.get('PAPPERS_API_KEY');
const PAPPERS_BASE_URL = 'https://api.pappers.fr/v2';
const DEFAULT_WORKSPACE_ID = Deno.env.get('DEFAULT_WORKSPACE_ID') || 'default';

interface PappersCompany {
  siren: string;
  siret: string;
  nom_entreprise: string;
  denomination: string;
  forme_juridique: string;
  date_creation: string;
  date_cessation: string | null;
  effectif: string;
  effectif_min: number;
  effectif_max: number;
  tranche_effectif: string;
  code_naf: string;
  libelle_code_naf: string;
  domaine_activite: string;
  convention_collective: string;
  capital: number;
  capital_formate: string;
  chiffre_affaires: number;
  resultat: number;
  numero_tva_intracommunautaire: string;
  greffe: string;
  date_immatriculation_rcs: string;
  siege: {
    siret: string;
    code_postal: string;
    ville: string;
    adresse_ligne_1: string;
    adresse_ligne_2: string;
    pays: string;
    latitude: number;
    longitude: number;
    code_insee: string;
    departement: string;
    region: string;
  };
  representants: Array<{
    nom: string;
    prenom: string;
    qualite: string;
    date_prise_poste: string;
    nationalite: string;
  }>;
  finances: Array<{
    annee: number;
    chiffre_affaires: number;
    resultat: number;
    effectif: number;
  }>;
  statut_rcs: string;
  objet_social: string;
  site_web: string;
  derniere_mise_a_jour_sirene: string;
  derniere_mise_a_jour_rcs: string;
  categorie_entreprise: string;
  annee_categorie_entreprise: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has cockpit access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cockpit access
    const { data: hasAccess } = await supabase.rpc('has_cockpit_access', { user_uuid: user.id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Cockpit access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { siret, siren, q, lead_id, workspace_id } = await req.json();
    const workspaceId = workspace_id || DEFAULT_WORKSPACE_ID;

    if (!PAPPERS_API_KEY) {
      console.error('PAPPERS_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Pappers API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== API QUOTA CHECK =====
    const quotaCheck = await checkAPIQuota({
      workspaceId,
      apiCategory: 'enrichment',
      apiName: 'pappers',
      userId: user.id,
    });

    if (!quotaCheck.allowed) {
      console.warn('[pappers-lookup] Quota exceeded:', quotaCheck.reason);
      return new Response(JSON.stringify({ 
        error: 'Quota API dépassé', 
        reason: quotaCheck.reason,
        usagePercent: quotaCheck.usagePercent,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log quota alerts if any
    for (const alert of quotaCheck.alerts) {
      console.log(`[pappers-lookup] Quota ${alert.type}: ${alert.message}`);
    }

    // ===== PREPARE API TRACKER =====
    const apiTracker = createAPICallTracker({
      workspaceId,
      apiName: 'pappers',
      apiCategory: 'enrichment',
      providerName: 'pappers',
    });

    let url: string;
    let operationType: string;
    let params = new URLSearchParams({ api_token: PAPPERS_API_KEY });

    // Search by SIRET (most precise)
    if (siret) {
      params.append('siret', siret);
      url = `${PAPPERS_BASE_URL}/entreprise?${params.toString()}`;
      operationType = 'company_by_siret';
    }
    // Search by SIREN
    else if (siren) {
      params.append('siren', siren);
      url = `${PAPPERS_BASE_URL}/entreprise?${params.toString()}`;
      operationType = 'company_by_siren';
    }
    // Search by company name
    else if (q) {
      params.append('q', q);
      params.append('page', '1');
      params.append('par_page', '5');
      url = `${PAPPERS_BASE_URL}/recherche?${params.toString()}`;
      operationType = 'search';
    }
    else {
      return new Response(JSON.stringify({ error: 'siret, siren, or q (search query) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[pappers-lookup] API call: ${operationType}`);

    const pappersResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!pappersResponse.ok) {
      const errorText = await pappersResponse.text();
      console.error('[pappers-lookup] API error:', pappersResponse.status, errorText);
      
      // Track failed request
      await apiTracker.error(operationType, String(pappersResponse.status), errorText, {
        userId: user.id,
        entityType: 'lead',
        entityId: lead_id,
      });
      
      if (pappersResponse.status === 404) {
        return new Response(JSON.stringify({ error: 'Entreprise non trouvée', found: false }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Pappers API error', details: errorText }), {
        status: pappersResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await pappersResponse.json();

    // Track successful request (Pappers charges per call, ~1-2 cents)
    await apiTracker.success(operationType, {
      userId: user.id,
      entityType: lead_id ? 'lead' : undefined,
      entityId: lead_id,
      estimatedCostCents: operationType === 'search' ? 1 : 2, // Search is cheaper
      metadata: {
        siret: siret || data.siret,
        siren: siren || data.siren,
        query: q,
      },
    });

    // If it's a search, return results list
    if (q && !siret && !siren) {
      const results = data.resultats || [];
      return new Response(JSON.stringify({
        found: results.length > 0,
        count: data.total || results.length,
        results: results.map((r: any) => ({
          siren: r.siren,
          siret: r.siret_siege,
          nom_entreprise: r.nom_entreprise || r.denomination,
          ville: r.siege?.ville,
          code_postal: r.siege?.code_postal,
          code_naf: r.code_naf,
          libelle_naf: r.libelle_code_naf,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single company result - format for lead enrichment
    const company: PappersCompany = data;
    
    const enrichedData = {
      found: true,
      // Identifiants
      siren: company.siren,
      siret: company.siret || company.siege?.siret,
      tva_intracommunautaire: company.numero_tva_intracommunautaire,
      
      // Entreprise
      company_name: company.nom_entreprise || company.denomination,
      legal_form: company.forme_juridique,
      category: company.categorie_entreprise,
      
      // Dates
      creation_date: company.date_creation,
      cessation_date: company.date_cessation,
      rcs_date: company.date_immatriculation_rcs,
      
      // Adresse siège
      address: company.siege ? 
        [company.siege.adresse_ligne_1, company.siege.adresse_ligne_2].filter(Boolean).join(' ') : null,
      postal_code: company.siege?.code_postal,
      city: company.siege?.ville,
      country: company.siege?.pays || 'France',
      code_insee: company.siege?.code_insee,
      departement: company.siege?.departement,
      region: company.siege?.region,
      
      // Activité
      naf_code: company.code_naf,
      naf_label: company.libelle_code_naf,
      industry: company.domaine_activite || company.libelle_code_naf,
      object_social: company.objet_social,
      convention_collective: company.convention_collective,
      
      // Effectifs
      employees: company.effectif,
      employees_range: company.tranche_effectif,
      employees_min: company.effectif_min,
      employees_max: company.effectif_max,
      
      // Finances
      capital: company.capital,
      capital_formatted: company.capital_formate,
      revenue: company.chiffre_affaires,
      profit: company.resultat,
      
      // Autres
      website: company.site_web,
      greffe: company.greffe,
      rcs_status: company.statut_rcs,
      last_update_sirene: company.derniere_mise_a_jour_sirene,
      last_update_rcs: company.derniere_mise_a_jour_rcs,
      
      // Dirigeants
      representatives: company.representants?.slice(0, 5).map(r => ({
        name: `${r.prenom} ${r.nom}`.trim(),
        position: r.qualite,
        since: r.date_prise_poste,
        nationality: r.nationalite,
      })) || [],
      
      // Historique financier
      finances: company.finances?.slice(0, 5) || [],
      
      // Coordonnées GPS
      coordinates: company.siege?.latitude && company.siege?.longitude ? {
        lat: company.siege.latitude,
        lng: company.siege.longitude,
      } : null,
    };

    // If lead_id provided, update the lead with enriched data
    if (lead_id) {
      const updateData: Record<string, any> = {};
      
      if (enrichedData.siret) updateData.siret = enrichedData.siret;
      if (enrichedData.company_name) updateData.company = enrichedData.company_name;
      if (enrichedData.address) updateData.address = enrichedData.address;
      if (enrichedData.postal_code) updateData.postal_code = enrichedData.postal_code;
      if (enrichedData.city) updateData.city = enrichedData.city;
      if (enrichedData.country) updateData.country = enrichedData.country;
      if (enrichedData.industry) updateData.industry = enrichedData.industry;
      if (enrichedData.website) updateData.website = enrichedData.website;
      
      // Map employees range to company_size
      if (enrichedData.employees_range) {
        const sizeMap: Record<string, string> = {
          '0': '1-10',
          '1-2': '1-10',
          '3-5': '1-10',
          '6-9': '1-10',
          '10-19': '11-50',
          '20-49': '11-50',
          '50-99': '51-200',
          '100-199': '51-200',
          '200-249': '201-500',
          '250-499': '201-500',
          '500-999': '501-1000',
          '1000-1999': '1000+',
          '2000-4999': '1000+',
          '5000-9999': '1000+',
          '10000+': '1000+',
        };
        updateData.company_size = sizeMap[enrichedData.employees_range] || enrichedData.employees_range;
      }

      // Store extended Pappers data in ai_metadata
      updateData.ai_metadata = {
        pappers_enriched_at: new Date().toISOString(),
        pappers_data: {
          siren: enrichedData.siren,
          tva_intracommunautaire: enrichedData.tva_intracommunautaire,
          legal_form: enrichedData.legal_form,
          category: enrichedData.category,
          creation_date: enrichedData.creation_date,
          cessation_date: enrichedData.cessation_date,
          rcs_date: enrichedData.rcs_date,
          naf_code: enrichedData.naf_code,
          naf_label: enrichedData.naf_label,
          convention_collective: enrichedData.convention_collective,
          capital: enrichedData.capital,
          capital_formatted: enrichedData.capital_formatted,
          revenue: enrichedData.revenue,
          profit: enrichedData.profit,
          employees_exact: enrichedData.employees,
          greffe: enrichedData.greffe,
          rcs_status: enrichedData.rcs_status,
          object_social: enrichedData.object_social,
          departement: enrichedData.departement,
          region: enrichedData.region,
          code_insee: enrichedData.code_insee,
          representatives: enrichedData.representatives,
          finances: enrichedData.finances,
          coordinates: enrichedData.coordinates,
          last_update_sirene: enrichedData.last_update_sirene,
          last_update_rcs: enrichedData.last_update_rcs,
        },
      };

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead_id);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        return new Response(JSON.stringify({ 
          ...enrichedData, 
          lead_updated: false, 
          update_error: updateError.message 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Lead ${lead_id} enriched with Pappers data`);
      return new Response(JSON.stringify({ ...enrichedData, lead_updated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(enrichedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in pappers-lookup:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
