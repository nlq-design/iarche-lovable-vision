import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTANTLY_API_URL = 'https://api.instantly.ai/api/v2';

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

    const INSTANTLY_API_KEY = Deno.env.get('INSTANTLY_API_KEY');
    if (!INSTANTLY_API_KEY) {
      return new Response(JSON.stringify({ error: 'INSTANTLY_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaign_id, action = 'status' } = await req.json();

    // Get campaign from database
    if (!campaign_id && action !== 'list_accounts') {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instantlyHeaders = {
      'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // List sending accounts (domains)
    if (action === 'list_accounts') {
      console.log('Fetching Instantly sending accounts...');
      
      const response = await fetch(`${INSTANTLY_API_URL}/accounts`, {
        method: 'GET',
        headers: instantlyHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Instantly accounts error:', response.status, errorText);
        throw new Error(`Instantly API error: ${response.status}`);
      }

      const accounts = await response.json();
      console.log(`Found ${accounts.length || 0} sending accounts`);

      return new Response(JSON.stringify({ accounts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get campaign from DB
    const { data: campaign, error: campaignError } = await supabase
      .from('vivier_campaigns')
      .select('*, email_domains(*)')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different actions
    switch (action) {
      case 'create': {
        console.log(`Creating Instantly campaign: ${campaign.name}`);
        
        // Prepare email sequences with campaign content
        const emailSubject = campaign.subject || campaign.name;
        const emailBody = campaign.html_content || campaign.body_html || '<p>Contenu de l\'email</p>';
        
        // Create campaign in Instantly with email sequence
        const createResponse = await fetch(`${INSTANTLY_API_URL}/campaigns`, {
          method: 'POST',
          headers: instantlyHeaders,
          body: JSON.stringify({
            name: campaign.name,
            campaign_schedule: {
              schedules: [{
                days: { 1: true, 2: true, 3: true, 4: true, 5: true },
                timezone: 'Europe/Paris',
                timing: { from: '09:00', to: '18:00' },
              }],
            },
            sequences: [{
              steps: [{
                type: 'email',
                delay: 0,
                variants: [{
                  subject: emailSubject,
                  body: emailBody,
                }],
              }],
            }],
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Instantly create error:', createResponse.status, errorText);
          throw new Error(`Failed to create campaign in Instantly: ${errorText}`);
        }

        const instantlyCampaign = await createResponse.json();
        console.log('Instantly campaign created:', instantlyCampaign.id);

        // Update local campaign with Instantly ID
        await supabase
          .from('vivier_campaigns')
          .update({ 
            instantly_campaign_id: instantlyCampaign.id,
            status: 'created',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', campaign_id);

        return new Response(JSON.stringify({ 
          success: true, 
          instantly_campaign_id: instantlyCampaign.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_leads': {
        if (!campaign.instantly_campaign_id) {
          return new Response(JSON.stringify({ error: 'Campaign not created in Instantly yet' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get recipients for this campaign
        const { data: recipients, error: recipientsError } = await supabase
          .from('vivier_campaign_recipients')
          .select('*, viviers(*)')
          .eq('campaign_id', campaign_id)
          .is('instantly_lead_id', null);

        if (recipientsError || !recipients || recipients.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            added: 0, 
            message: 'No new recipients to add' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Adding ${recipients.length} leads to Instantly campaign`);

        // Add leads to Instantly campaign
        const leads = recipients.map(r => ({
          email: r.viviers.email,
          first_name: r.viviers.first_name || r.viviers.name?.split(' ')[0] || '',
          last_name: r.viviers.name?.split(' ').slice(1).join(' ') || '',
          company_name: r.viviers.company || '',
          custom_variables: {
            industry: r.viviers.industry || '',
            city: r.viviers.city || '',
            vivier_id: r.vivier_id,
          },
        }));

        const addLeadsResponse = await fetch(
          `${INSTANTLY_API_URL}/campaigns/${campaign.instantly_campaign_id}/leads`,
          {
            method: 'POST',
            headers: instantlyHeaders,
            body: JSON.stringify({ leads }),
          }
        );

        if (!addLeadsResponse.ok) {
          const errorText = await addLeadsResponse.text();
          console.error('Instantly add leads error:', addLeadsResponse.status, errorText);
          throw new Error(`Failed to add leads to Instantly`);
        }

        const addResult = await addLeadsResponse.json();
        console.log('Leads added to Instantly:', addResult);

        // Update recipients as synced
        const recipientIds = recipients.map(r => r.id);
        await supabase
          .from('vivier_campaign_recipients')
          .update({ instantly_lead_id: 'synced' })
          .in('id', recipientIds);

        return new Response(JSON.stringify({ 
          success: true, 
          added: recipients.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'launch': {
        if (!campaign.instantly_campaign_id) {
          return new Response(JSON.stringify({ error: 'Campaign not created in Instantly yet' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Launching Instantly campaign: ${campaign.instantly_campaign_id}`);

        const launchResponse = await fetch(
          `${INSTANTLY_API_URL}/campaigns/${campaign.instantly_campaign_id}/activate`,
          {
            method: 'POST',
            headers: instantlyHeaders,
          }
        );

        if (!launchResponse.ok) {
          const errorText = await launchResponse.text();
          console.error('Instantly launch error:', launchResponse.status, errorText);
          throw new Error(`Failed to launch campaign`);
        }

        await supabase
          .from('vivier_campaigns')
          .update({ 
            status: 'active',
            launched_at: new Date().toISOString(),
          })
          .eq('id', campaign_id);

        return new Response(JSON.stringify({ success: true, status: 'active' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'pause': {
        if (!campaign.instantly_campaign_id) {
          return new Response(JSON.stringify({ error: 'Campaign not in Instantly' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const pauseResponse = await fetch(
          `${INSTANTLY_API_URL}/campaigns/${campaign.instantly_campaign_id}/pause`,
          {
            method: 'POST',
            headers: instantlyHeaders,
          }
        );

        if (!pauseResponse.ok) {
          throw new Error('Failed to pause campaign');
        }

        await supabase
          .from('vivier_campaigns')
          .update({ status: 'paused' })
          .eq('id', campaign_id);

        return new Response(JSON.stringify({ success: true, status: 'paused' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status':
      default: {
        if (!campaign.instantly_campaign_id) {
          return new Response(JSON.stringify({ 
            status: campaign.status,
            instantly_synced: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const statusResponse = await fetch(
          `${INSTANTLY_API_URL}/campaigns/${campaign.instantly_campaign_id}/analytics`,
          {
            method: 'GET',
            headers: instantlyHeaders,
          }
        );

        let analytics = null;
        if (statusResponse.ok) {
          analytics = await statusResponse.json();
        }

        return new Response(JSON.stringify({
          status: campaign.status,
          instantly_synced: true,
          instantly_campaign_id: campaign.instantly_campaign_id,
          analytics,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

  } catch (error) {
    console.error('Error in send-instantly-campaign:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
