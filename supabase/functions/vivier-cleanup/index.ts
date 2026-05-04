import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUserIdFromRequest, assertSuperAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Vivier Data Cleanup Edge Function v3
 * 
 * Uses optimized RPC functions for efficient pattern matching:
 * 1. SIRET in company_size (9 or 14 digits) → move to siret field
 * 2. City prefix "0-VILLE" in company_size → extract to city
 * 3. City+SIREN "VILLE-SIREN" in company_size → extract city + siret
 * 4. NAF in company_size → move to naf_code
 * 5. Year in company_size → move to creation_date
 * 6. Email in contact_name → null contact_name
 * 
 * NEVER deletes records, only restructures fields
 */

interface CleanupStats {
  analyzed: number;
  siretMoved: number;
  citiesExtracted: number;
  citySirenExtracted: number;
  nafCodesMoved: number;
  yearsMoved: number;
  emailsCleared: number;
  yearInNafMoved: number;
  invalidSiretCleared: number;
  truncatedNafCleared: number;
  errors: number;
}

interface CleanupResult {
  id: string;
  field: string;
  oldValue: string;
  action: string;
  targetField: string;
  newValue: string;
}

// Pattern matchers for parsing
const CITY_PREFIX_PATTERN = /^(\d+)-([A-Z][A-Z\s]+)$/;
const CITY_SIREN_PATTERN = /^([A-Z][A-Z\s]+)-(\d{9})$/;

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

    // M-sec : résolution userId via JWT puis garde super_admin
    try {
      const userId = await resolveUserIdFromRequest(req);
      await assertSuperAdmin(supabase, userId);
    } catch (guardResponse) {
      if (guardResponse instanceof Response) return guardResponse;
      throw guardResponse;
    }


    const { mode = 'preview', batchSize = 1000, cleanupType = 'all' } = await req.json();
    
    console.log(`Cleanup mode: ${mode}, batchSize: ${batchSize}, type: ${cleanupType}`);

    const stats: CleanupStats = {
      analyzed: 0,
      siretMoved: 0,
      citiesExtracted: 0,
      citySirenExtracted: 0,
      nafCodesMoved: 0,
      yearsMoved: 0,
      emailsCleared: 0,
      yearInNafMoved: 0,
      invalidSiretCleared: 0,
      truncatedNafCleared: 0,
      errors: 0,
    };
    const results: CleanupResult[] = [];

    // ========================================
    // CLEANUP 1: SIRET in company_size (9 or 14 digits)
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'siret_in_size') {
      console.log('Checking SIRET in company_size...');
      
      const { data: siretLeads, error: siretError } = await supabase
        .rpc('get_viviers_with_siret_in_size', { p_limit: batchSize });

      if (!siretError && siretLeads && siretLeads.length > 0) {
        for (const lead of siretLeads) {
          stats.analyzed++;
          results.push({
            id: lead.id,
            field: 'company_size',
            oldValue: lead.company_size,
            action: 'move_siret',
            targetField: 'siret',
            newValue: lead.company_size,
          });
          stats.siretMoved++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ siret: lead.company_size, company_size: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error moving SIRET for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`SIRET in company_size: ${stats.siretMoved} found`);
    }

    // ========================================
    // CLEANUP 2: City prefix pattern "0-VILLE"
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'city_in_size') {
      console.log('Checking city prefix patterns...');
      
      const { data: cityLeads, error: cityError } = await supabase
        .rpc('get_viviers_with_city_prefix_in_size', { p_limit: batchSize });

      if (!cityError && cityLeads && cityLeads.length > 0) {
        for (const lead of cityLeads) {
          stats.analyzed++;
          const match = lead.company_size?.match(CITY_PREFIX_PATTERN);
          if (match) {
            const extractedCity = match[2].trim();
            const employeePrefix = match[1];
            
            results.push({
              id: lead.id,
              field: 'company_size',
              oldValue: lead.company_size,
              action: 'extract_city_prefix',
              targetField: 'city',
              newValue: extractedCity,
            });
            stats.citiesExtracted++;

            if (mode === 'execute') {
              const { error: updateError } = await supabase
                .from('viviers')
                .update({ 
                  city: extractedCity,
                  company_size: employeePrefix === '0' ? null : employeePrefix,
                })
                .eq('id', lead.id);
              if (updateError) {
                console.error(`Error extracting city for ${lead.id}:`, updateError);
                stats.errors++;
              }
            }
          }
        }
      }
      console.log(`City prefix patterns: ${stats.citiesExtracted} found`);
    }

    // ========================================
    // CLEANUP 3: City+SIREN pattern "VILLE-SIREN"
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'city_siren_in_size') {
      console.log('Checking city+SIREN patterns...');
      
      const { data: citySirenLeads, error: csError } = await supabase
        .rpc('get_viviers_with_city_siren_in_size', { p_limit: batchSize });

      if (!csError && citySirenLeads && citySirenLeads.length > 0) {
        for (const lead of citySirenLeads) {
          stats.analyzed++;
          const match = lead.company_size?.match(CITY_SIREN_PATTERN);
          if (match) {
            const extractedCity = match[1].trim();
            const extractedSiren = match[2];
            
            const updates: Record<string, string | null> = { company_size: null };
            const actions: string[] = [];
            
            if (!lead.city || lead.city.trim() === '') {
              updates.city = extractedCity;
              actions.push(`city=${extractedCity}`);
            }
            if (!lead.siret || lead.siret.trim() === '') {
              updates.siret = extractedSiren;
              actions.push(`siret=${extractedSiren}`);
            }

            if (actions.length > 0) {
              results.push({
                id: lead.id,
                field: 'company_size',
                oldValue: lead.company_size,
                action: 'extract_city_siren',
                targetField: 'city+siret',
                newValue: actions.join(', '),
              });
              stats.citySirenExtracted++;

              if (mode === 'execute') {
                const { error: updateError } = await supabase
                  .from('viviers')
                  .update(updates)
                  .eq('id', lead.id);
                if (updateError) {
                  console.error(`Error extracting city+SIREN for ${lead.id}:`, updateError);
                  stats.errors++;
                }
              }
            }
          }
        }
      }
      console.log(`City+SIREN patterns: ${stats.citySirenExtracted} found`);
    }

    // ========================================
    // CLEANUP 4: NAF codes in company_size
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'naf_in_size') {
      console.log('Checking NAF codes in company_size...');
      
      const { data: nafLeads, error: nafError } = await supabase
        .rpc('get_viviers_with_naf_in_size', { p_limit: batchSize });

      if (!nafError && nafLeads && nafLeads.length > 0) {
        for (const lead of nafLeads) {
          stats.analyzed++;
          results.push({
            id: lead.id,
            field: 'company_size',
            oldValue: lead.company_size,
            action: 'move_naf',
            targetField: 'naf_code',
            newValue: lead.company_size,
          });
          stats.nafCodesMoved++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ naf_code: lead.company_size, company_size: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error moving NAF for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`NAF in company_size: ${stats.nafCodesMoved} found`);
    }

    // ========================================
    // CLEANUP 5: Years in company_size
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'year_in_size') {
      console.log('Checking years in company_size...');
      
      const { data: yearLeads, error: yearError } = await supabase
        .rpc('get_viviers_with_year_in_size', { p_limit: batchSize });

      if (!yearError && yearLeads && yearLeads.length > 0) {
        for (const lead of yearLeads) {
          stats.analyzed++;
          const year = lead.company_size;
          results.push({
            id: lead.id,
            field: 'company_size',
            oldValue: year,
            action: 'move_year',
            targetField: 'creation_date',
            newValue: `${year}-01-01`,
          });
          stats.yearsMoved++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ creation_date: `${year}-01-01`, company_size: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error moving year for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`Years in company_size: ${stats.yearsMoved} found`);
    }

    // ========================================
    // CLEANUP 6: Emails in contact_name
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'email_in_contact') {
      console.log('Checking emails in contact_name...');
      
      const { data: emailLeads, error: emailError } = await supabase
        .rpc('get_viviers_with_email_in_contact', { p_limit: batchSize });

      if (!emailError && emailLeads && emailLeads.length > 0) {
        for (const lead of emailLeads) {
          stats.analyzed++;
          results.push({
            id: lead.id,
            field: 'contact_name',
            oldValue: lead.contact_name,
            action: 'clear_email_from_name',
            targetField: 'contact_name',
            newValue: 'NULL',
          });
          stats.emailsCleared++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ contact_name: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error clearing email from name for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`Emails in contact_name: ${stats.emailsCleared} found`);
    }

    // ========================================
    // CLEANUP 7: Years in naf_code → move to creation_date
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'year_in_naf') {
      console.log('Checking years in naf_code...');
      
      const { data: yearNafLeads, error: yearNafError } = await supabase
        .rpc('get_viviers_with_year_in_naf', { p_limit: batchSize });

      if (!yearNafError && yearNafLeads && yearNafLeads.length > 0) {
        for (const lead of yearNafLeads) {
          stats.analyzed++;
          const year = lead.naf_code;
          results.push({
            id: lead.id,
            field: 'naf_code',
            oldValue: year,
            action: 'move_year_from_naf',
            targetField: 'creation_date',
            newValue: `${year}-01-01`,
          });
          stats.yearInNafMoved++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ creation_date: `${year}-01-01`, naf_code: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error moving year from naf for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`Years in naf_code: ${stats.yearInNafMoved} found`);
    }

    // ========================================
    // CLEANUP 8: Invalid SIRET (not 9 or 14 digits) → nullify
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'invalid_siret') {
      console.log('Checking invalid SIRET lengths...');
      
      const { data: invalidSiretLeads, error: invSiretError } = await supabase
        .rpc('get_viviers_with_invalid_siret', { p_limit: batchSize });

      if (!invSiretError && invalidSiretLeads && invalidSiretLeads.length > 0) {
        for (const lead of invalidSiretLeads) {
          stats.analyzed++;
          results.push({
            id: lead.id,
            field: 'siret',
            oldValue: lead.siret,
            action: 'clear_invalid_siret',
            targetField: 'siret',
            newValue: 'NULL',
          });
          stats.invalidSiretCleared++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ siret: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error clearing invalid siret for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`Invalid SIRET cleared: ${stats.invalidSiretCleared} found`);
    }

    // ========================================
    // CLEANUP 9: Truncated NAF codes (1-2 digits) → nullify
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'truncated_naf') {
      console.log('Checking truncated NAF codes...');
      
      const { data: truncatedNafLeads, error: truncNafError } = await supabase
        .rpc('get_viviers_with_truncated_naf', { p_limit: batchSize });

      if (!truncNafError && truncatedNafLeads && truncatedNafLeads.length > 0) {
        for (const lead of truncatedNafLeads) {
          stats.analyzed++;
          results.push({
            id: lead.id,
            field: 'naf_code',
            oldValue: lead.naf_code,
            action: 'clear_truncated_naf',
            targetField: 'naf_code',
            newValue: 'NULL',
          });
          stats.truncatedNafCleared++;

          if (mode === 'execute') {
            const { error: updateError } = await supabase
              .from('viviers')
              .update({ naf_code: null })
              .eq('id', lead.id);
            if (updateError) {
              console.error(`Error clearing truncated naf for ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
      }
      console.log(`Truncated NAF codes cleared: ${stats.truncatedNafCleared} found`);
    }

    const totalChanges = stats.siretMoved + stats.citiesExtracted + stats.citySirenExtracted + 
                         stats.nafCodesMoved + stats.yearsMoved + stats.emailsCleared +
                         stats.yearInNafMoved + stats.invalidSiretCleared + stats.truncatedNafCleared;

    console.log('=== CLEANUP COMPLETE ===');
    console.log('Stats:', JSON.stringify(stats, null, 2));

    return new Response(JSON.stringify({
      success: true,
      mode,
      cleanupType,
      stats,
      results: results.slice(0, 200),
      totalChanges,
      message: mode === 'preview' 
        ? `Preview: ${totalChanges} corrections identifiées` 
        : `Exécuté: ${totalChanges} corrections appliquées (${stats.errors} erreurs)`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
