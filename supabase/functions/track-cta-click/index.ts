import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration: 30 requests per 5 minutes per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 30,
  windowMinutes: 5,
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Check rate limit
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_CONFIG.windowMinutes);

    const { data: existingRequests } = await supabase
      .from('rate_limit_requests')
      .select('request_count')
      .eq('ip_address', clientIP)
      .eq('endpoint', 'track-cta-click')
      .gte('window_start', windowStart.toISOString())
      .single();

    const currentCount = existingRequests?.request_count || 0;

    if (currentCount >= RATE_LIMIT_CONFIG.maxRequests) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '300'
          } 
        }
      );
    }

    // Update or create rate limit entry
    if (existingRequests) {
      await supabase
        .from('rate_limit_requests')
        .update({ request_count: currentCount + 1 })
        .eq('ip_address', clientIP)
        .eq('endpoint', 'track-cta-click')
        .gte('window_start', windowStart.toISOString());
    } else {
      await supabase
        .from('rate_limit_requests')
        .insert({
          ip_address: clientIP,
          endpoint: 'track-cta-click',
          request_count: 1,
          window_start: new Date().toISOString()
        });
    }

    const { 
      cta_name, 
      source_page, 
      source_context, 
      user_session, 
      referrer 
    } = await req.json();

    // Validation with stricter checks
    if (!cta_name || typeof cta_name !== 'string' || cta_name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid cta_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!source_page || typeof source_page !== 'string' || source_page.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid source_page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize optional fields
    const sanitizedContext = source_context && typeof source_context === 'string' 
      ? source_context.slice(0, 500) 
      : null;
    const sanitizedSession = user_session && typeof user_session === 'string' 
      ? user_session.slice(0, 100) 
      : null;
    const sanitizedReferrer = referrer && typeof referrer === 'string' 
      ? referrer.slice(0, 500) 
      : null;

    // Insert CTA click
    const { data, error } = await supabase
      .from('cta_clicks')
      .insert({
        cta_name: cta_name.slice(0, 100),
        source_page: source_page.slice(0, 500),
        source_context: sanitizedContext,
        user_session: sanitizedSession,
        referrer: sanitizedReferrer,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking CTA click:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CTA click tracked:', {
      id: data.id,
      cta_name,
      source_page,
      ip: clientIP,
    });

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-cta-click function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});