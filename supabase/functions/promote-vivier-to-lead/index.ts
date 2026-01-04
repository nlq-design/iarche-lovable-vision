import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vivier_ids, enrich = true } = await req.json();

    if (!vivier_ids || !Array.isArray(vivier_ids) || vivier_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'vivier_ids array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Promoting ${vivier_ids.length} viviers to leads, enrich: ${enrich}`);

    // Fetch viviers to promote
    const { data: viviers, error: fetchError } = await supabase
      .from('viviers')
      .select('*')
      .in('id', vivier_ids)
      .is('promoted_at', null);

    if (fetchError) {
      console.error('Error fetching viviers:', fetchError);
      throw fetchError;
    }

    if (!viviers || viviers.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        promoted: 0, 
        message: 'No viviers to promote (already promoted or not found)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = {
      promoted: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const vivier of viviers) {
      try {
        // Check if lead with same email exists
        const { data: existingLead, error: leadCheckError } = await supabase
          .from('leads')
          .select('id, company, phone, industry, company_size')
          .eq('email', vivier.email)
          .maybeSingle();

        if (leadCheckError) {
          console.error(`Error checking lead for ${vivier.email}:`, leadCheckError);
          results.errors.push(`${vivier.email}: ${leadCheckError.message}`);
          continue;
        }

        let leadId: string;

        if (existingLead) {
          // Enrich existing lead with vivier data if missing
          const updates: Record<string, unknown> = {};
          
          if (!existingLead.company && vivier.company) updates.company = vivier.company;
          if (!existingLead.phone && vivier.phone) updates.phone = vivier.phone;
          if (!existingLead.industry && vivier.industry) updates.industry = vivier.industry;
          if (!existingLead.company_size && vivier.company_size) updates.company_size = vivier.company_size;
          
          if (Object.keys(updates).length > 0) {
            updates.last_contacted_at = new Date().toISOString();
            updates.source_context = `Enrichi depuis vivier (cold_score: ${vivier.cold_score})`;
            
            await supabase
              .from('leads')
              .update(updates)
              .eq('id', existingLead.id);
          }

          leadId = existingLead.id;
          results.updated++;
          console.log(`Lead ${vivier.email} enriched with vivier data`);
        } else {
          // Create new lead from vivier
          const { data: newLead, error: insertError } = await supabase
            .from('leads')
            .insert({
              email: vivier.email,
              name: vivier.name || vivier.first_name || 'Prospect',
              company: vivier.company,
              phone: vivier.phone,
              industry: vivier.industry,
              company_size: vivier.company_size,
              siret: vivier.siret,
              city: vivier.city,
              postal_code: vivier.postal_code,
              country: vivier.country || 'France',
              source: 'vivier',
              source_context: `Cold outreach (score: ${vivier.cold_score}, source: ${vivier.source})`,
              qualification_status: vivier.cold_score >= 70 ? 'qualified' : 'new',
              consent_marketing: false,
              lead_score: Math.round((vivier.cold_score || 50) / 2),
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`Error creating lead for ${vivier.email}:`, insertError);
            results.errors.push(`${vivier.email}: ${insertError.message}`);
            continue;
          }

          leadId = newLead.id;
          results.promoted++;
          console.log(`Lead ${vivier.email} created from vivier`);
        }

        // Mark vivier as promoted
        await supabase
          .from('viviers')
          .update({
            promoted_at: new Date().toISOString(),
            promoted_to_lead_id: leadId,
          })
          .eq('id', vivier.id);

        // Optionally enrich with Pappers if SIRET available
        if (enrich && vivier.siret) {
          try {
            await supabase.functions.invoke('pappers-lookup', {
              body: { siret: vivier.siret, lead_id: leadId },
            });
            console.log(`Pappers enrichment triggered for ${vivier.siret}`);
          } catch (enrichError) {
            console.warn(`Pappers enrichment failed for ${vivier.siret}:`, enrichError);
          }
        }

      } catch (vivierError) {
        console.error(`Error processing vivier ${vivier.id}:`, vivierError);
        results.errors.push(`${vivier.email}: ${vivierError instanceof Error ? vivierError.message : 'Unknown error'}`);
      }
    }

    console.log(`Promotion complete: ${results.promoted} new, ${results.updated} enriched, ${results.errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in promote-vivier-to-lead:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
