import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LighthouseMetrics {
  performance_score: number;
  accessibility_score: number;
  best_practices_score: number;
  seo_score: number;
  fcp: number;
  lcp: number;
  tti: number;
  tbt: number;
  cls: number;
  bundle_size_js: number;
  bundle_size_css: number;
  bundle_size_total: number;
  environment: string;
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const metrics: LighthouseMetrics = await req.json();

    console.log('Recording Lighthouse metrics:', metrics);

    // Insert metrics into database
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert({
        performance_score: metrics.performance_score,
        accessibility_score: metrics.accessibility_score,
        best_practices_score: metrics.best_practices_score,
        seo_score: metrics.seo_score,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        tti: metrics.tti,
        tbt: metrics.tbt,
        cls: metrics.cls,
        bundle_size_js: metrics.bundle_size_js,
        bundle_size_css: metrics.bundle_size_css,
        bundle_size_total: metrics.bundle_size_total,
        environment: metrics.environment,
        notes: metrics.notes,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting metrics:', error);
      throw error;
    }

    console.log('Metrics recorded successfully:', data.id);

    // Check thresholds and send alert if needed
    const { error: alertError } = await supabase.functions.invoke('check-performance-threshold', {
      body: { metricId: data.id },
    });

    if (alertError) {
      console.error('Error checking performance thresholds:', alertError);
    }

    return new Response(
      JSON.stringify({ success: true, metricId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in record-lighthouse-metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
