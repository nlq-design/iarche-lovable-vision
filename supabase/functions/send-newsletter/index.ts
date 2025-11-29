import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

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

    if (subscribersError || !subscribers || subscribers.length === 0) {
      console.error('No subscribers found:', subscribersError);
      return new Response(
        JSON.stringify({ error: 'No subscribers found' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const articleUrl = `https://iarche.fr/actualites/${article.slug}`;

    // Send emails to all subscribers
    const emailPromises = subscribers.map((subscriber) =>
      resend.emails.send({
        from: "IArche <onboarding@resend.dev>",
        to: [subscriber.email],
        subject: `Nouvel article : ${article.title}`,
        html: `
          <h1>Nouvel article sur IArche</h1>
          <h2>${article.title}</h2>
          ${article.excerpt ? `<p>${article.excerpt}</p>` : ''}
          <p>
            <a href="${articleUrl}" style="background: #C9652E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Lire l'article
            </a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 32px;">
            Vous recevez cet email car vous êtes inscrit à la newsletter IArche.<br>
            <a href="https://iarche.fr" style="color: #C9652E;">Visiter notre site</a>
          </p>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

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
