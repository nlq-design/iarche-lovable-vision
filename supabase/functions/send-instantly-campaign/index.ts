import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTANTLY_API_URL = 'https://api.instantly.ai/api/v2';

// Email template colors and themes
const EMAIL_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  grey: '#6B7280',
  lightGrey: '#E5E7EB',
};

const EMAIL_THEMES: Record<string, {
  headerBg: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
  footerBg: string;
  accent: string;
  logoSrc: string;
}> = {
  'bleu-nuit': {
    headerBg: `linear-gradient(135deg, ${EMAIL_COLORS.bleuNuit} 0%, ${EMAIL_COLORS.terracotta} 100%)`,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'blanc-casse': {
    headerBg: EMAIL_COLORS.blancCasse,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
  'terracotta': {
    headerBg: EMAIL_COLORS.terracotta,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.bleuNuit,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'minimaliste': {
    headerBg: EMAIL_COLORS.white,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.white,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
};

function generateEmailTemplate(bodyHtml: string, themeKey: string, senderName: string): string {
  const t = EMAIL_THEMES[themeKey] || EMAIL_THEMES['bleu-nuit'];
  const headerStyle = t.headerBg.startsWith('linear') 
    ? `background: ${t.headerBg};` 
    : `background-color: ${t.headerBg};`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: ${t.bodyBg}; }
    .header { ${headerStyle} padding: 32px; text-align: center; }
    .header img { height: 40px; }
    .content { padding: 32px; color: ${t.bodyText}; line-height: 1.6; }
    .content h1, .content h2, .content h3 { color: ${EMAIL_COLORS.bleuNuit}; margin-top: 0; }
    .content a { color: ${t.accent}; }
    .button { display: inline-block; background: ${t.accent}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500; }
    .footer { background: ${t.footerBg}; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid ${EMAIL_COLORS.lightGrey}; }
    .footer p { color: ${EMAIL_COLORS.grey}; margin: 8px 0; }
    .footer a { color: ${t.accent}; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="background: #f4f4f4; padding: 20px 0;">
    <div class="container">
      <div class="header">
        <img src="${t.logoSrc}" alt="IArche" />
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>Envoyé par ${senderName} • IArche</p>
        <p><a href="https://iarche.fr/unsubscribe?email={{email}}&campaign={{campaign_id}}">Se désinscrire</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

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
        const rawBody = campaign.html_content || campaign.body_html || '<p>Contenu de l\'email</p>';
        
        // Generate full email template with branding
        const theme = campaign.template_theme || 'bleu-nuit';
        const senderName = campaign.sender_name || 'IArche';
        const fullEmailHtml = generateEmailTemplate(rawBody, theme, senderName);
        
        // Use custom schedule from database or defaults
        const scheduleDays = campaign.schedule_days || { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false };
        const scheduleTimezone = campaign.schedule_timezone || 'Europe/Paris';
        const scheduleFrom = campaign.schedule_from || '09:00';
        const scheduleTo = campaign.schedule_to || '18:00';

        // Create campaign in Instantly with email sequence
        const createResponse = await fetch(`${INSTANTLY_API_URL}/campaigns`, {
          method: 'POST',
          headers: instantlyHeaders,
          body: JSON.stringify({
            name: campaign.name,
            campaign_schedule: {
              schedules: [{
                name: 'Default Schedule',
                days: scheduleDays,
                timezone: scheduleTimezone,
                timing: { from: scheduleFrom, to: scheduleTo },
              }],
            },
            sequences: [{
              steps: [{
                type: 'email',
                delay: 0,
                variants: [{
                  subject: emailSubject,
                  body: fullEmailHtml,
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
