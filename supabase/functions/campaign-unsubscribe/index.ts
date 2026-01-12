import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, campaign_id, token } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing unsubscribe for: ${email}`);

    // Check if already unsubscribed in vivier_campaign_recipients
    if (campaign_id) {
      const { data: recipient } = await supabase
        .from('vivier_campaign_recipients')
        .select('id, unsubscribed_at')
        .eq('email', email.toLowerCase())
        .eq('campaign_id', campaign_id)
        .single();

      if (recipient?.unsubscribed_at) {
        return new Response(
          JSON.stringify({ success: true, already_unsubscribed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update recipient status
      if (recipient) {
        await supabase
          .from('vivier_campaign_recipients')
          .update({ 
            unsubscribed_at: new Date().toISOString(),
            status: 'unsubscribed',
          })
          .eq('id', recipient.id);
      }
    }

    // Also update/mark in viviers table if exists
    const { data: vivier } = await supabase
      .from('viviers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (vivier) {
      await supabase
        .from('viviers')
        .update({ 
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('id', vivier.id);
    }

    // Mark all pending campaign recipients for this email as unsubscribed
    await supabase
      .from('vivier_campaign_recipients')
      .update({ 
        unsubscribed_at: new Date().toISOString(),
        status: 'unsubscribed',
      })
      .eq('email', email.toLowerCase())
      .is('unsubscribed_at', null);

    // Log the unsubscribe event
    await supabase.from('vivier_campaign_events').insert({
      campaign_id: campaign_id || null,
      event_type: 'unsubscribe',
      event_data: { email, source: 'web' },
    });

    console.log(`Successfully unsubscribed: ${email}`);

    return new Response(
      JSON.stringify({ success: true, already_unsubscribed: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
