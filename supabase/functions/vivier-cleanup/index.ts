import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Vivier Data Cleanup Edge Function
 * 
 * Detects and restructures polluted data:
 * - company_size containing cities (e.g., "0-DAX") -> extract to city
 * - company_size containing NAF codes (e.g., "4333Z") -> move to naf_code
 * - company_size containing years (e.g., "2022") -> move to creation_date
 * - naf_code containing years -> move to creation_date
 * 
 * NEVER deletes data, only restructures
 */

interface CleanupStats {
  analyzed: number;
  citiesExtracted: number;
  nafCodesMoved: number;
  yearsMoved: number;
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
const CITY_PATTERN = /^(\d+)-([A-Z\s]+)$/; // "0-DAX", "2-MONT DE MARSAN"
const NAF_PATTERN = /^[0-9]{2,4}[A-Z]$/; // "4333Z", "68Z"
const YEAR_PATTERN = /^(19|20)\d{2}$/; // "2020", "2022"
const EMPLOYEE_RANGE_PATTERN = /^(\d+)-(\d+)$/; // "1-2", "10-19"

function isValidEmployeeRange(value: string): boolean {
  const match = value.match(EMPLOYEE_RANGE_PATTERN);
  if (!match) return false;
  const [_, min, max] = match;
  // Valid ranges have max >= min and both are reasonable employee counts
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

    const { mode = 'preview', batchSize = 1000 } = await req.json();
    
    console.log(`Cleanup mode: ${mode}, batchSize: ${batchSize}`);

    const stats: CleanupStats = {
      analyzed: 0,
      citiesExtracted: 0,
      nafCodesMoved: 0,
      yearsMoved: 0,
      errors: 0,
    };
    const results: CleanupResult[] = [];

    // Fetch leads with potentially polluted company_size
    const { data: leadsToClean, error: fetchError } = await supabase
      .from('viviers')
      .select('id, company_size, naf_code, city, creation_date')
      .not('company_size', 'is', null)
      .limit(batchSize);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${leadsToClean?.length || 0} leads to analyze`);

    for (const lead of leadsToClean || []) {
      stats.analyzed++;
      const companySize = lead.company_size?.toString().trim();
      
      if (!companySize) continue;

      // Check for city pattern (e.g., "0-DAX", "2-MONT DE MARSAN")
      const cityMatch = companySize.match(CITY_PATTERN);
      if (cityMatch) {
        const extractedCity = cityMatch[2].trim();
        const employeePrefix = cityMatch[1];
        
        // Only extract if city field is empty or different
        if (!lead.city || lead.city.trim() === '') {
          results.push({
            id: lead.id,
            field: 'company_size',
            oldValue: companySize,
            action: 'extract_city',
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
              console.error(`Error updating lead ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
        continue;
      }

      // Check for NAF code pattern (e.g., "4333Z")
      if (NAF_PATTERN.test(companySize)) {
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
              console.error(`Error updating lead ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
        continue;
      }

      // Check for year pattern (e.g., "2022")
      if (YEAR_PATTERN.test(companySize)) {
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
              console.error(`Error updating lead ${lead.id}:`, updateError);
              stats.errors++;
            }
          }
        }
        continue;
      }

      // Check if it's a valid employee range - if not, it's garbage
      if (!isValidEmployeeRange(companySize) && !/^\d+$/.test(companySize)) {
        // Log unusual values but don't delete
        console.log(`Unusual company_size value: "${companySize}" for lead ${lead.id}`);
      }
    }

    // Also check naf_code for years
    const { data: leadsWithNafYears, error: nafFetchError } = await supabase
      .from('viviers')
      .select('id, naf_code, creation_date')
      .not('naf_code', 'is', null)
      .limit(batchSize);

    if (!nafFetchError && leadsWithNafYears) {
      for (const lead of leadsWithNafYears) {
        const nafCode = lead.naf_code?.toString().trim();
        
        if (nafCode && YEAR_PATTERN.test(nafCode)) {
          if (!lead.creation_date) {
            results.push({
              id: lead.id,
              field: 'naf_code',
              oldValue: nafCode,
              action: 'move_year',
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
                console.error(`Error updating lead ${lead.id}:`, updateError);
                stats.errors++;
              }
            }
          }
        }
      }
    }

    console.log('Cleanup stats:', stats);

    return new Response(JSON.stringify({
      success: true,
      mode,
      stats,
      results: results.slice(0, 100), // Limit preview results
      totalChanges: results.length,
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
