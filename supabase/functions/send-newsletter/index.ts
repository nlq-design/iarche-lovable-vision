import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterRequest {
  article_id: string;
  article_title: string;
  article_slug: string;
  article_excerpt: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id, article_title, article_slug, article_excerpt }: NewsletterRequest = await req.json();

    console.log(`Sending newsletter for article: ${article_title}`);

    // Créer le client Supabase avec la clé service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer tous les abonnés
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email');

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      throw new Error('Could not fetch subscribers');
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers to notify');
      return new Response(JSON.stringify({ message: 'No subscribers to notify' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subscriberEmails = subscribers.map(s => s.email);
    console.log(`Sending to ${subscriberEmails.length} subscribers`);

    // Envoyer l'email à tous les abonnés
    const emailResponse = await resend.emails.send({
      from: "IArche <onboarding@resend.dev>", // Remplacez par votre domaine vérifié
      to: subscriberEmails,
      subject: `Nouvel article : ${article_title}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 2px solid #2754C5;
              }
              .logo {
                font-size: 32px;
                font-weight: bold;
                background: linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }
              .content {
                padding: 30px 0;
              }
              h1 {
                color: #1a1a1a;
                font-size: 24px;
                margin-bottom: 16px;
              }
              .excerpt {
                color: #666;
                font-size: 16px;
                margin-bottom: 24px;
                line-height: 1.6;
              }
              .cta-button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #2754C5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .footer {
                border-top: 1px solid #eee;
                padding-top: 20px;
                margin-top: 40px;
                text-align: center;
                color: #999;
                font-size: 14px;
              }
              .footer a {
                color: #2754C5;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">IArche</div>
              <p style="color: #666; margin-top: 8px;">Agence IA Bayonne</p>
            </div>
            
            <div class="content">
              <h1>${article_title}</h1>
              
              ${article_excerpt ? `<p class="excerpt">${article_excerpt}</p>` : ''}
              
              <p>Un nouvel article vient d'être publié sur notre blog. Découvrez-le dès maintenant !</p>
              
              <a href="https://iarche.fr/actualites/${article_slug}" class="cta-button">
                Lire l'article complet →
              </a>
            </div>
            
            <div class="footer">
              <p>
                Vous recevez cet email car vous êtes abonné à la newsletter IArche.<br>
                <a href="https://iarche.fr/newsletter">Gérer mes préférences</a>
              </p>
              <p style="margin-top: 16px;">
                IArche · Agence IA · Bayonne · France<br>
                <a href="https://iarche.fr">iarche.fr</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Newsletter sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      subscribers_count: subscriberEmails.length 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-newsletter function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
