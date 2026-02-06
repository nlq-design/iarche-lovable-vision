import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackAPIUsage } from "../_shared/api-tracker.ts";

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
    
    console.log('📩 Instantly webhook received:', JSON.stringify(payload, null, 2));

    const { 
      event_type, 
      campaign_id: instantly_campaign_id,
      lead_email,
      timestamp,
      data,
    } = payload;

    if (!event_type || !instantly_campaign_id) {
      console.warn('Missing required fields:', { event_type, instantly_campaign_id });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find our campaign by Instantly ID
    const { data: campaign, error: campaignError } = await supabase
      .from('vivier_campaigns')
      .select('id, name, sent_count, open_count, click_count, reply_count, bounce_count, unsubscribe_count')
      .eq('instantly_campaign_id', instantly_campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.warn(`Campaign not found for Instantly ID: ${instantly_campaign_id}`);
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Matched campaign: ${campaign.name} (${campaign.id})`);

    // Find recipient by email in vivier_campaign_recipients
    let recipientId: string | null = null;
    let vivierId: string | null = null;
    
    if (lead_email) {
      // First get the vivier with this email
      const { data: vivier } = await supabase
        .from('viviers')
        .select('id')
        .eq('email', lead_email)
        .maybeSingle();
      
      if (vivier) {
        // Then find the recipient record
        const { data: recipient } = await supabase
          .from('vivier_campaign_recipients')
          .select('id, vivier_id')
          .eq('campaign_id', campaign.id)
          .eq('vivier_id', vivier.id)
          .maybeSingle();
        
        if (recipient) {
          recipientId = recipient.id;
          vivierId = recipient.vivier_id;
          console.log(`Found recipient: ${recipientId} for vivier: ${vivierId}`);
        }
      }
    }

    // Map Instantly events to recipient updates and campaign counter increments
    const eventConfig: Record<string, { 
      recipientField: string; 
      recipientValue: string | Date;
      campaignCounter?: string;
    }> = {
      'email_sent': { 
        recipientField: 'sent_at', 
        recipientValue: new Date().toISOString(),
        campaignCounter: 'sent_count'
      },
      'email_opened': { 
        recipientField: 'opened_at', 
        recipientValue: new Date().toISOString(),
        campaignCounter: 'open_count'
      },
      'email_clicked': { 
        recipientField: 'clicked_at', 
        recipientValue: new Date().toISOString(),
        campaignCounter: 'click_count'
      },
      'email_replied': { 
        recipientField: 'replied_at', 
        recipientValue: new Date().toISOString(),
        campaignCounter: 'reply_count'
      },
      'email_bounced': { 
        recipientField: 'bounce_type', 
        recipientValue: data?.bounce_type || 'hard',
        campaignCounter: 'bounce_count'
      },
      'lead_unsubscribed': { 
        recipientField: 'unsubscribed_at', 
        recipientValue: new Date().toISOString(),
        campaignCounter: 'unsubscribe_count'
      },
    };

    const config = eventConfig[event_type];
    
    // Update recipient if found
    if (config && recipientId) {
      await supabase
        .from('vivier_campaign_recipients')
        .update({ [config.recipientField]: config.recipientValue })
        .eq('id', recipientId);

      console.log(`Updated recipient ${recipientId}: ${config.recipientField} = ${config.recipientValue}`);
    }

    // Update campaign counters
    if (config?.campaignCounter) {
      const counterField = config.campaignCounter as keyof typeof campaign;
      const currentValue = (campaign[counterField] as number) || 0;
      
      await supabase
        .from('vivier_campaigns')
        .update({ 
          [config.campaignCounter]: currentValue + 1,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      console.log(`Updated campaign ${campaign.id}: ${config.campaignCounter} = ${currentValue + 1}`);
    }

    // Calculate rates after updates
    if (config?.campaignCounter && ['open_count', 'click_count', 'reply_count', 'bounce_count'].includes(config.campaignCounter)) {
      const { data: updatedCampaign } = await supabase
        .from('vivier_campaigns')
        .select('sent_count, open_count, click_count, reply_count, bounce_count')
        .eq('id', campaign.id)
        .single();

      if (updatedCampaign && updatedCampaign.sent_count && updatedCampaign.sent_count > 0) {
        const rates: Record<string, number> = {};
        
        if (updatedCampaign.open_count) {
          rates.open_rate = (updatedCampaign.open_count / updatedCampaign.sent_count) * 100;
        }
        if (updatedCampaign.click_count) {
          rates.click_rate = (updatedCampaign.click_count / updatedCampaign.sent_count) * 100;
        }
        if (updatedCampaign.reply_count) {
          rates.reply_rate = (updatedCampaign.reply_count / updatedCampaign.sent_count) * 100;
        }
        if (updatedCampaign.bounce_count) {
          rates.bounce_rate = (updatedCampaign.bounce_count / updatedCampaign.sent_count) * 100;
        }

        if (Object.keys(rates).length > 0) {
          await supabase
            .from('vivier_campaigns')
            .update(rates)
            .eq('id', campaign.id);
          
          console.log(`Updated rates for campaign ${campaign.id}:`, rates);
        }
      }
    }

    // Log activity for replies (hot leads!)
    if (event_type === 'email_replied' && vivierId) {
      console.log(`🔥 Reply detected for vivier ${vivierId} - creating activity log`);
      
      await supabase.from('activity_log').insert({
        workspace_id: '00000000-0000-0000-0000-000000000001',
        entity_type: 'vivier',
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
          lead_email,
        },
      });
    }

    // Track webhook event
    try {
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'outreach',
        apiName: 'instantly-webhook',
        providerName: 'instantly',
        operationType: event_type,
        success: true,
        metadata: { campaign_id: campaign.id, lead_email, event_type },
      });
    } catch (e) {
      console.error('[instantly-webhook] Tracking error:', e);
    }

    console.log(`✅ Webhook processed successfully: ${event_type} for campaign ${campaign.name}`);

    return new Response(JSON.stringify({
      received: true, 
      matched: true,
      campaign_id: campaign.id,
      event_type,
      recipient_updated: !!recipientId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in instantly-webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
