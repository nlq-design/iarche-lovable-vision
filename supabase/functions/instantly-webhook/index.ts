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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    console.log('Instantly webhook received:', JSON.stringify(payload, null, 2));

    const { 
      event_type, 
      campaign_id: instantly_campaign_id,
      lead_email,
      timestamp,
      data,
    } = payload;

    if (!event_type || !instantly_campaign_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find our campaign by Instantly ID
    const { data: campaign, error: campaignError } = await supabase
      .from('vivier_campaigns')
      .select('id, name')
      .eq('instantly_campaign_id', instantly_campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.warn(`Campaign not found for Instantly ID: ${instantly_campaign_id}`);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find recipient by email
    let recipientId: string | null = null;
    let vivierId: string | null = null;
    
    if (lead_email) {
      const { data: recipient } = await supabase
        .from('vivier_campaign_recipients')
        .select('id, vivier_id')
        .eq('campaign_id', campaign.id)
        .eq('viviers.email', lead_email)
        .single();
      
      if (recipient) {
        recipientId = recipient.id;
        vivierId = recipient.vivier_id;
      }
    }

    // Map Instantly events to our status
    const eventUpdates: Record<string, { field: string; value: string | Date }> = {
      'email_sent': { field: 'sent_at', value: new Date().toISOString() },
      'email_opened': { field: 'opened_at', value: new Date().toISOString() },
      'email_clicked': { field: 'clicked_at', value: new Date().toISOString() },
      'email_replied': { field: 'replied_at', value: new Date().toISOString() },
      'email_bounced': { field: 'bounce_type', value: data?.bounce_type || 'hard' },
      'lead_unsubscribed': { field: 'unsubscribed_at', value: new Date().toISOString() },
    };

    const update = eventUpdates[event_type];
    
    if (update && recipientId) {
      await supabase
        .from('vivier_campaign_recipients')
        .update({ [update.field]: update.value })
        .eq('id', recipientId);

      console.log(`Updated recipient ${recipientId}: ${update.field} = ${update.value}`);

      // If replied, consider promoting to lead
      if (event_type === 'email_replied' && vivierId) {
        console.log(`Reply detected for vivier ${vivierId}, consider promotion to lead`);
        
        // Log activity
        await supabase.from('activity_log').insert({
          workspace_id: '00000000-0000-0000-0000-000000000001',
          entity_type: 'lead',
          entity_id: vivierId,
          activity_type: 'email_reply',
          title: `Réponse email reçue`,
          content: `Le prospect a répondu à la campagne "${campaign.name}"`,
          pending_ai_review: true,
          metadata: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            event_type,
            instantly_campaign_id,
          },
        });
      }
    }

    // Update campaign stats (aggregate) - simple update without RPC
    if (event_type === 'email_sent') {
      const { data: currentCampaign } = await supabase
        .from('vivier_campaigns')
        .select('emails_sent')
        .eq('id', campaign.id)
        .single();
      
      if (currentCampaign) {
        await supabase
          .from('vivier_campaigns')
          .update({ emails_sent: (currentCampaign.emails_sent || 0) + 1 })
          .eq('id', campaign.id);
      }
    }

    return new Response(JSON.stringify({ 
      received: true, 
      matched: true,
      campaign_id: campaign.id,
      event_type,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in instantly-webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
