import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user has cockpit access
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cockpit access via has_cockpit_access
    const { data: hasAccess } = await supabase.rpc('has_cockpit_access', { p_user_id: user.id });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ALL viviers in batches of 10000
    const PAGE_SIZE = 10000;
    let allRows: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('viviers')
        .select('company_name, contact_name, contact_first_name, contact_last_name, email, phone, phone2, city, postal_code, region, country, industry, siret, siren, naf_code, legal_form, contact_position, website, linkedin_url, address, company_size, revenue_range, employee_count, cold_score, status, tags, notes, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        offset += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    // Build CSV
    const headers = [
      'Entreprise', 'Contact', 'Prénom', 'Nom', 'Poste', 'Email', 'Téléphone', 'Téléphone 2',
      'Adresse', 'Code Postal', 'Ville', 'Région', 'Pays',
      'Secteur', 'SIRET', 'SIREN', 'Code NAF', 'Forme juridique',
      'Site web', 'LinkedIn', 'Taille', 'CA', 'Effectif',
      'Score', 'Statut', 'Tags', 'Notes', 'Créé le', 'Mis à jour le'
    ];

    const escCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    // Use semicolon separator for French Excel compatibility
    const csvLines = [headers.join(';')];

    for (const r of allRows) {
      const contact = r.contact_name || [r.contact_first_name, r.contact_last_name].filter(Boolean).join(' ') || '';
      const tags = Array.isArray(r.tags) ? r.tags.join(', ') : '';
      const createdAt = r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '';
      const updatedAt = r.updated_at ? new Date(r.updated_at).toLocaleDateString('fr-FR') : '';

      csvLines.push([
        escCsv(r.company_name),
        escCsv(contact),
        escCsv(r.contact_first_name),
        escCsv(r.contact_last_name),
        escCsv(r.contact_position),
        escCsv(r.email),
        escCsv(r.phone),
        escCsv(r.phone2),
        escCsv(r.address),
        escCsv(r.postal_code),
        escCsv(r.city),
        escCsv(r.region),
        escCsv(r.country),
        escCsv(r.industry),
        escCsv(r.siret),
        escCsv(r.siren),
        escCsv(r.naf_code),
        escCsv(r.legal_form),
        escCsv(r.website),
        escCsv(r.linkedin_url),
        escCsv(r.company_size),
        escCsv(r.revenue_range),
        escCsv(r.employee_count),
        escCsv(r.cold_score),
        escCsv(r.status),
        escCsv(tags),
        escCsv(r.notes),
        escCsv(createdAt),
        escCsv(updatedAt),
      ].join(';'));
    }

    // BOM for UTF-8 Excel compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + csvLines.join('\n');

    const date = new Date().toISOString().split('T')[0];

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="viviers-export-complet-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
