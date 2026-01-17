import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Vivier Data Cleanup Edge Function v2
 * 
 * Comprehensive data quality cleanup:
 * 1. SIRET in company_size (5653) → move to siret field
 * 2. City patterns "0-VILLE" in company_size (3901) → extract to city
 * 3. City+SIREN patterns "VILLE-SIREN" in company_size (862) → extract city + siret
 * 4. Year in company_size (151) → move to creation_date
 * 5. NAF in company_size (96) → move to naf_code
 * 6. Email in contact_name (5) → null contact_name
 * 7. SIRET with invalid length → flag/fix
 * 8. NAF codes that are just numbers → fix format
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
  siretFixed: number;
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

// Pattern matchers
const CITY_PREFIX_PATTERN = /^(\d+)-([A-Z][A-Z\s]+)$/; // "0-DAX", "2-MONT DE MARSAN"
const CITY_SIREN_PATTERN = /^([A-Z][A-Z\s]+)-(\d{9})$/; // "MONT DE MARSAN-645581212"
const SIRET_14_PATTERN = /^\d{14}$/; // Full SIRET
const SIRET_13_PATTERN = /^\d{13}$/; // Truncated SIRET (missing last digit)
const SIREN_9_PATTERN = /^\d{9}$/; // SIREN only
const NAF_PATTERN = /^[0-9]{2,4}[A-Z]$/; // "4333Z", "68Z"
const YEAR_PATTERN = /^(19|20)\d{2}$/; // "2020", "2022"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_RANGE_PATTERN = /^(\d+)-(\d+)$/; // "1-2", "10-19"

function isValidEmployeeRange(value: string): boolean {
  const match = value.match(EMPLOYEE_RANGE_PATTERN);
  if (!match) return false;
  const [_, min, max] = match;
  return parseInt(max) >= parseInt(min) && parseInt(max) <= 50000;
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode = 'preview', batchSize = 2000, cleanupType = 'all' } = await req.json();
    
    console.log(`Cleanup mode: ${mode}, batchSize: ${batchSize}, type: ${cleanupType}`);

    const stats: CleanupStats = {
      analyzed: 0,
      siretMoved: 0,
      citiesExtracted: 0,
      citySirenExtracted: 0,
      nafCodesMoved: 0,
      yearsMoved: 0,
      emailsCleared: 0,
      siretFixed: 0,
      errors: 0,
    };
    const results: CleanupResult[] = [];

    // ========================================
    // CLEANUP 1: SIRET in company_size (9 or 14 digits) - using RPC for regex filter
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'siret_in_size') {
      console.log('Checking SIRET in company_size...');
      
      // Use raw SQL to filter only SIRET-like patterns
      const { data: siretInSize, error: siretError } = await supabase
        .rpc('get_viviers_with_siret_in_size', { p_limit: batchSize });

      if (siretError) {
        // Fallback: scan all and filter in code
        console.log('RPC not found, using fallback scan...');
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('viviers')
          .select('id, company_size, siret')
          .is('siret', null)
          .not('company_size', 'is', null)
          .limit(batchSize);
        
        if (!fallbackErr && fallbackData) {
          for (const lead of fallbackData) {
            const companySize = lead.company_size?.toString().trim();
            if (!companySize) continue;

            if (SIRET_14_PATTERN.test(companySize) || SIREN_9_PATTERN.test(companySize)) {
              stats.analyzed++;
              results.push({
                id: lead.id,
                field: 'company_size',
                oldValue: companySize,
                action: 'move_siret',
                targetField: 'siret',
                newValue: companySize,
              });
              stats.siretMoved++;

              if (mode === 'execute') {
                const { error: updateError } = await supabase
                  .from('viviers')
                  .update({ siret: companySize, company_size: null })
                  .eq('id', lead.id);
                if (updateError) stats.errors++;
              }
            }
          }
        }
      } else if (siretInSize) {
        for (const lead of siretInSize) {
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
            if (updateError) stats.errors++;
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
      
      const { data: cityPrefixLeads, error: cityError } = await supabase
        .from('viviers')
        .select('id, company_size, city')
        .not('company_size', 'is', null)
        .limit(batchSize);

      if (!cityError && cityPrefixLeads) {
        for (const lead of cityPrefixLeads) {
          const companySize = lead.company_size?.toString().trim();
          if (!companySize) continue;

          const cityMatch = companySize.match(CITY_PREFIX_PATTERN);
          if (cityMatch) {
            stats.analyzed++;
            const extractedCity = cityMatch[2].trim();
            const employeePrefix = cityMatch[1];
            
            if (!lead.city || lead.city.trim() === '') {
              results.push({
                id: lead.id,
                field: 'company_size',
                oldValue: companySize,
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
                  console.error(`Error extracting city for lead ${lead.id}:`, updateError);
                  stats.errors++;
                }
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
        .from('viviers')
        .select('id, company_size, city, siret')
        .not('company_size', 'is', null)
        .limit(batchSize);

      if (!csError && citySirenLeads) {
        for (const lead of citySirenLeads) {
          const companySize = lead.company_size?.toString().trim();
          if (!companySize) continue;

          const citySirenMatch = companySize.match(CITY_SIREN_PATTERN);
          if (citySirenMatch) {
            stats.analyzed++;
            const extractedCity = citySirenMatch[1].trim();
            const extractedSiren = citySirenMatch[2];
            
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
                oldValue: companySize,
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
                  console.error(`Error extracting city+SIREN for lead ${lead.id}:`, updateError);
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
        .from('viviers')
        .select('id, company_size, naf_code')
        .not('company_size', 'is', null)
        .limit(batchSize);

      if (!nafError && nafLeads) {
        for (const lead of nafLeads) {
          const companySize = lead.company_size?.toString().trim();
          if (!companySize) continue;

          if (NAF_PATTERN.test(companySize)) {
            stats.analyzed++;
            
            if (!lead.naf_code || lead.naf_code.trim() === '') {
              results.push({
                id: lead.id,
                field: 'company_size',
                oldValue: companySize,
                action: 'move_naf',
                targetField: 'naf_code',
                newValue: companySize,
              });
              stats.nafCodesMoved++;

              if (mode === 'execute') {
                const { error: updateError } = await supabase
                  .from('viviers')
                  .update({ 
                    naf_code: companySize,
                    company_size: null,
                  })
                  .eq('id', lead.id);
                
                if (updateError) {
                  console.error(`Error moving NAF for lead ${lead.id}:`, updateError);
                  stats.errors++;
                }
              }
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
        .from('viviers')
        .select('id, company_size, creation_date')
        .not('company_size', 'is', null)
        .limit(batchSize);

      if (!yearError && yearLeads) {
        for (const lead of yearLeads) {
          const companySize = lead.company_size?.toString().trim();
          if (!companySize) continue;

          if (YEAR_PATTERN.test(companySize)) {
            stats.analyzed++;
            
            if (!lead.creation_date) {
              results.push({
                id: lead.id,
                field: 'company_size',
                oldValue: companySize,
                action: 'move_year',
                targetField: 'creation_date',
                newValue: `${companySize}-01-01`,
              });
              stats.yearsMoved++;

              if (mode === 'execute') {
                const { error: updateError } = await supabase
                  .from('viviers')
                  .update({ 
                    creation_date: `${companySize}-01-01`,
                    company_size: null,
                  })
                  .eq('id', lead.id);
                
                if (updateError) {
                  console.error(`Error moving year for lead ${lead.id}:`, updateError);
                  stats.errors++;
                }
              }
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
        .from('viviers')
        .select('id, contact_name, email')
        .not('contact_name', 'is', null)
        .limit(batchSize);

      if (!emailError && emailLeads) {
        for (const lead of emailLeads) {
          const contactName = lead.contact_name?.toString().trim();
          if (!contactName) continue;

          if (EMAIL_PATTERN.test(contactName)) {
            stats.analyzed++;
            
            results.push({
              id: lead.id,
              field: 'contact_name',
              oldValue: contactName,
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
                console.error(`Error clearing email from contact_name for lead ${lead.id}:`, updateError);
                stats.errors++;
              }
            }
          }
        }
      }
      console.log(`Emails in contact_name: ${stats.emailsCleared} found`);
    }

    // ========================================
    // CLEANUP 7: Invalid SIRET lengths (pad to 14)
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'fix_siret_length') {
      console.log('Checking SIRET lengths...');
      
      const { data: siretLeads, error: siretLenError } = await supabase
        .from('viviers')
        .select('id, siret')
        .not('siret', 'is', null)
        .limit(batchSize);

      if (!siretLenError && siretLeads) {
        for (const lead of siretLeads) {
          const siret = lead.siret?.toString().trim();
          if (!siret || !/^\d+$/.test(siret)) continue;

          // 12 or 13 digits = truncated SIRET, try to pad with zeros
          if (siret.length === 12 || siret.length === 13) {
            stats.analyzed++;
            const paddedSiret = siret.padEnd(14, '0');
            
            results.push({
              id: lead.id,
              field: 'siret',
              oldValue: siret,
              action: 'pad_siret',
              targetField: 'siret',
              newValue: paddedSiret,
            });
            stats.siretFixed++;

            if (mode === 'execute') {
              const { error: updateError } = await supabase
                .from('viviers')
                .update({ siret: paddedSiret })
                .eq('id', lead.id);
              
              if (updateError) {
                console.error(`Error padding SIRET for lead ${lead.id}:`, updateError);
                stats.errors++;
              }
            }
          }
        }
      }
      console.log(`SIRET lengths fixed: ${stats.siretFixed} found`);
    }

    // ========================================
    // CLEANUP 8: Years in naf_code
    // ========================================
    if (cleanupType === 'all' || cleanupType === 'year_in_naf') {
      console.log('Checking years in naf_code...');
      
      const { data: nafYearLeads, error: nafYearError } = await supabase
        .from('viviers')
        .select('id, naf_code, creation_date')
        .not('naf_code', 'is', null)
        .limit(batchSize);

      if (!nafYearError && nafYearLeads) {
        for (const lead of nafYearLeads) {
          const nafCode = lead.naf_code?.toString().trim();
          if (!nafCode) continue;

          if (YEAR_PATTERN.test(nafCode)) {
            stats.analyzed++;
            
            if (!lead.creation_date) {
              results.push({
                id: lead.id,
                field: 'naf_code',
                oldValue: nafCode,
                action: 'move_year_from_naf',
                targetField: 'creation_date',
                newValue: `${nafCode}-01-01`,
              });
              stats.yearsMoved++;

              if (mode === 'execute') {
                const { error: updateError } = await supabase
                  .from('viviers')
                  .update({ 
                    creation_date: `${nafCode}-01-01`,
                    naf_code: null,
                  })
                  .eq('id', lead.id);
                
                if (updateError) {
                  console.error(`Error moving year from naf_code for lead ${lead.id}:`, updateError);
                  stats.errors++;
                }
              }
            }
          }
        }
      }
    }

    const totalChanges = stats.siretMoved + stats.citiesExtracted + stats.citySirenExtracted + 
                         stats.nafCodesMoved + stats.yearsMoved + stats.emailsCleared + stats.siretFixed;

    console.log('=== CLEANUP COMPLETE ===');
    console.log('Stats:', JSON.stringify(stats, null, 2));

    return new Response(JSON.stringify({
      success: true,
      mode,
      cleanupType,
      stats,
      results: results.slice(0, 200), // Limit preview results
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
