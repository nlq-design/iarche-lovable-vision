import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logEmailBatch } from '../_shared/emailLogger.ts';
import { checkAPIQuota, trackAPIUsage, createAPICallTracker } from '../_shared/api-tracker.ts';

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Default workspace for API tracking
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification de l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Vérifier que l'utilisateur est admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le rôle admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      subject, 
      htmlContent, 
      senderName = "IArche",
      senderEmail = "newsletter@iarche.fr",
      replyTo = "nlq@nlq.fr"
    }: CampaignRequest = await req.json();

    if (!subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Subject and htmlContent are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check API quota before proceeding
    const quotaCheck = await checkAPIQuota({
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: user.id,
      userRole: 'admin',
      apiCategory: 'email',
      apiName: 'brevo',
      providerName: 'brevo',
    });

    if (!quotaCheck.allowed) {
      console.warn('[send-brevo-campaign] Quota exceeded:', quotaCheck.reason);
      return new Response(
        JSON.stringify({ error: 'Quota email dépassé', reason: quotaCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log quota warnings
    for (const alert of quotaCheck.alerts) {
      console.warn(`[send-brevo-campaign] Alert: ${alert.type} - ${alert.message}`);
    }

    console.log('Sending Brevo campaign:', subject);

    // Récupérer tous les abonnés newsletter
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email');

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers found');
      return new Response(
        JSON.stringify({ 
          message: 'No subscribers found - campaign not sent',
          sent: 0,
          failed: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Envoyer via Brevo API
    const emailResults: Array<{ email: string; success: boolean; error?: string; messageId?: string }> = [];

    for (const subscriber of subscribers) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY!,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: subscriber.email }],
            replyTo: { email: replyTo },
            subject: subject,
            htmlContent: htmlContent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          emailResults.push({ 
            email: subscriber.email, 
            success: false, 
            error: errorData.message || `HTTP ${response.status}` 
          });
        } else {
          const data = await response.json();
          emailResults.push({ 
            email: subscriber.email, 
            success: true, 
            messageId: data.messageId 
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        emailResults.push({ email: subscriber.email, success: false, error: errorMessage });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    // Track API usage for each email sent
    await trackAPIUsage({
      workspaceId: DEFAULT_WORKSPACE_ID,
      apiName: 'brevo',
      apiCategory: 'email',
      operationType: 'campaign_send',
      providerName: 'brevo',
      userId: user.id,
      requestCount: subscribers.length,
      success: successCount > 0,
      errorMessage: failCount > 0 ? `${failCount} emails failed` : undefined,
      estimatedCostCents: successCount * 0.1, // ~0.1 cent per email
      metadata: {
        campaign_subject: subject,
        total_subscribers: subscribers.length,
        success_count: successCount,
        fail_count: failCount,
      },
    });

    // Log tous les emails
    const emailLogs = emailResults.map(result => ({
      recipient_email: result.email,
      subject: subject,
      source_type: 'brevo-campaign' as const,
      email_type: 'user_confirmation' as const,
      source_id: undefined,
      status: result.success ? 'sent' as const : 'failed' as const,
      error_message: result.error,
      metadata: { brevo_message_id: result.messageId, sender: senderName }
    }));

    await logEmailBatch(emailLogs);

    console.log(`Brevo campaign sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Campaign sent via Brevo', 
        sent: successCount,
        failed: failCount,
        total: subscribers.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-brevo-campaign function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
