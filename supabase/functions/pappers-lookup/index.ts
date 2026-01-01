import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAPPERS_API_KEY = Deno.env.get('PAPPERS_API_KEY');
const PAPPERS_BASE_URL = 'https://api.pappers.fr/v2';

interface PappersCompany {
  siren: string;
  siret: string;
  nom_entreprise: string;
  denomination: string;
  forme_juridique: string;
  date_creation: string;
  effectif: string;
  effectif_min: number;
  effectif_max: number;
  tranche_effectif: string;
  code_naf: string;
  libelle_code_naf: string;
  domaine_activite: string;
  convention_collective: string;
  capital: number;
  chiffre_affaires: number;
  resultat: number;
  siege: {
    siret: string;
    code_postal: string;
    ville: string;
    adresse_ligne_1: string;
    adresse_ligne_2: string;
    pays: string;
    latitude: number;
    longitude: number;
  };
  representants: Array<{
    nom: string;
    prenom: string;
    qualite: string;
    date_prise_poste: string;
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

    const { siret, siren, q, lead_id } = await req.json();

    if (!PAPPERS_API_KEY) {
      console.error('PAPPERS_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Pappers API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let url: string;
    let params = new URLSearchParams({ api_token: PAPPERS_API_KEY });

    // Search by SIRET (most precise)
    if (siret) {
      params.append('siret', siret);
      url = `${PAPPERS_BASE_URL}/entreprise?${params.toString()}`;
    }
    // Search by SIREN
    else if (siren) {
      params.append('siren', siren);
      url = `${PAPPERS_BASE_URL}/entreprise?${params.toString()}`;
    }
    // Search by company name
    else if (q) {
      params.append('q', q);
      params.append('page', '1');
      params.append('par_page', '5');
      url = `${PAPPERS_BASE_URL}/recherche?${params.toString()}`;
    }
    else {
      return new Response(JSON.stringify({ error: 'siret, siren, or q (search query) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Pappers API call: ${siret ? 'SIRET' : siren ? 'SIREN' : 'Search'} lookup`);

    const pappersResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!pappersResponse.ok) {
      const errorText = await pappersResponse.text();
      console.error('Pappers API error:', pappersResponse.status, errorText);
      
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
      siren: company.siren,
      siret: company.siret || company.siege?.siret,
      company_name: company.nom_entreprise || company.denomination,
      legal_form: company.forme_juridique,
      creation_date: company.date_creation,
      address: company.siege ? 
        [company.siege.adresse_ligne_1, company.siege.adresse_ligne_2].filter(Boolean).join(' ') : null,
      postal_code: company.siege?.code_postal,
      city: company.siege?.ville,
      country: company.siege?.pays || 'France',
      naf_code: company.code_naf,
      naf_label: company.libelle_code_naf,
      industry: company.domaine_activite || company.libelle_code_naf,
      employees: company.effectif,
      employees_range: company.tranche_effectif,
      employees_min: company.effectif_min,
      employees_max: company.effectif_max,
      capital: company.capital,
      revenue: company.chiffre_affaires,
      profit: company.resultat,
      website: company.site_web,
      object_social: company.objet_social,
      rcs_status: company.statut_rcs,
      representatives: company.representants?.slice(0, 5).map(r => ({
        name: `${r.prenom} ${r.nom}`.trim(),
        position: r.qualite,
        since: r.date_prise_poste,
      })) || [],
      finances: company.finances?.slice(0, 3) || [],
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
          legal_form: enrichedData.legal_form,
          creation_date: enrichedData.creation_date,
          naf_code: enrichedData.naf_code,
          naf_label: enrichedData.naf_label,
          capital: enrichedData.capital,
          revenue: enrichedData.revenue,
          profit: enrichedData.profit,
          employees_exact: enrichedData.employees,
          representatives: enrichedData.representatives,
          finances: enrichedData.finances,
          object_social: enrichedData.object_social,
          rcs_status: enrichedData.rcs_status,
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
