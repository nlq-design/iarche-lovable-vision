import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUserIdFromRequest, assertSuperAdmin } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignTestRequest {
  campaign_id: string;
  recipients: string[];
  subject: string;
  html_content: string;
  sender_name?: string;
  sender_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendCampaignTestRequest = await req.json();
    const { campaign_id, recipients, subject, html_content, sender_name, sender_email } = body;

    // Validation
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one recipient is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (recipients.length > 5) {
      return new Response(
        JSON.stringify({ error: "Maximum 5 test recipients allowed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subject || !html_content) {
      return new Response(
        JSON.stringify({ error: "subject and html_content are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter(r => emailRegex.test(r));

    if (validRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid email addresses provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare test subject with [TEST] prefix
    const testSubject = `[TEST] ${subject}`;

    // Prepare HTML with test banner
    const testBanner = `
      <div style="background: #f59e0b; color: #1a1a1a; padding: 12px 20px; text-align: center; font-weight: 600; font-size: 14px;">
        ⚠️ CECI EST UN EMAIL DE TEST - Campagne: ${campaign_id.substring(0, 8)}...
      </div>
    `;
    const testHtml = html_content.replace('<body>', `<body>${testBanner}`);

    // Send test emails
    const fromEmail = sender_email || "campaigns@iarche.fr";
    const fromName = sender_name || "IArche Campaigns";
    
    console.log(`Sending test email to ${validRecipients.length} recipients for campaign ${campaign_id}`);

    const sendResults = await Promise.all(
      validRecipients.map(async (recipient) => {
        try {
          const result = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [recipient],
            subject: testSubject,
            html: testHtml,
            reply_to: "nlq@iarche.fr",
          });

          const resendData = result?.data as { id?: string } | undefined;
          const resendId = resendData?.id || "unknown";

          console.log(`Test email sent to ${recipient}:`, result);

          // Log the test email
          await supabase.from("email_logs").insert({
            source_type: "campaign_test",
            source_id: campaign_id,
            email_type: "campaign_test",
            recipient_email: recipient,
            subject: testSubject,
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { campaign_id, resend_id: resendId },
          });

          return { email: recipient, success: true, id: resendId };
        } catch (error) {
          console.error(`Failed to send test email to ${recipient}:`, error);
          
          // Log failure
          await supabase.from("email_logs").insert({
            source_type: "campaign_test",
            source_id: campaign_id,
            email_type: "campaign_test",
            recipient_email: recipient,
            subject: testSubject,
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            metadata: { campaign_id },
          });

          return { email: recipient, success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
      })
    );

    const successCount = sendResults.filter(r => r.success).length;
    const failedCount = sendResults.filter(r => !r.success).length;

    console.log(`Test campaign ${campaign_id}: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        results: sendResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-campaign-test:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
