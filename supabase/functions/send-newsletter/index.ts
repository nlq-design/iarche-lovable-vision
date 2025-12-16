import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";
import { logEmailBatch } from '../_shared/emailLogger.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton } from '../_shared/emailTemplate.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterRequest {
  articleId: string;
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

    const { articleId }: NewsletterRequest = await req.json();

    console.log('Sending newsletter for article:', articleId);

    // Get article details
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('title, slug, excerpt')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      console.error('Article not found:', articleError);
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all newsletter subscribers
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

    // Si aucun abonné, retourner un succès avec message informatif
    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers found - newsletter not sent');
      return new Response(
        JSON.stringify({ 
          message: 'No subscribers found - newsletter not sent',
          sent: 0,
          failed: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const articleUrl = `https://iarche.fr/actualites/${article.slug}`;
    const emailSubject = `📰 Nouvel article : ${article.title}`;

    // Generate email HTML with v4.0 template
    const header = getEmailHeader('Nouvel article sur IArche');
    const content = `
      <h2 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 20px; margin: 0 0 16px 0;">${article.title}</h2>
      ${article.excerpt ? `<p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; line-height: 1.7; margin-bottom: 24px;">${article.excerpt}</p>` : ''}
      <div style="text-align: center; margin: 32px 0;">
        ${getCtaButton('Lire l\'article →', articleUrl)}
      </div>
      <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 14px; margin-top: 24px;">
        À bientôt,<br>
        <strong style="color: ${EMAIL_COLORS.nightBlue};">L'équipe IArche</strong>
      </p>
    `;
    const footer = getEmailFooter();
    const emailHtml = wrapEmailContent(header, content, footer);

    // Send emails to all subscribers
    const emailResults: Array<{ email: string; success: boolean; error?: string; resendId?: string }> = [];

    for (const subscriber of subscribers) {
      try {
        const { data, error } = await resend.emails.send({
          from: "IArche Newsletter <newsletter@iarche.fr>",
          to: [subscriber.email],
          replyTo: 'nlq@iarche.fr',
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          emailResults.push({ email: subscriber.email, success: false, error: error.message });
        } else {
          emailResults.push({ email: subscriber.email, success: true, resendId: data?.id });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        emailResults.push({ email: subscriber.email, success: false, error: errorMessage });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    // Log all emails in batch
    const emailLogs = emailResults.map(result => ({
      recipient_email: result.email,
      subject: emailSubject,
      source_type: 'newsletter' as const,
      email_type: 'user_confirmation' as const,
      source_id: articleId,
      status: result.success ? 'sent' as const : 'failed' as const,
      error_message: result.error,
      metadata: { article_title: article.title, resend_id: result.resendId }
    }));

    await logEmailBatch(emailLogs);

    console.log(`Newsletter sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Newsletter sent', 
        sent: successCount,
        failed: failCount 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter function:", error);
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
