import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CommentNotificationRequest {
  comment_id: string;
  article_id: string;
  author_name: string;
  author_email: string;
  content: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { comment_id, article_id, author_name, author_email, content }: CommentNotificationRequest = await req.json();

    // Créer le client Supabase avec la clé service pour accéder aux données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer l'article concerné
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('title, slug')
      .eq('id', article_id)
      .single();

    if (articleError) {
      console.error('Error fetching article:', articleError);
      throw new Error('Article not found');
    }

    // Récupérer les admins pour leur envoyer la notification
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw new Error('Could not fetch admins');
    }

    // Récupérer les emails des admins
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Could not fetch admin users');
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    const adminEmails = users
      .filter(u => adminUserIds.includes(u.id))
      .map(u => u.email)
      .filter((email): email is string => email !== undefined);

    if (adminEmails.length === 0) {
      console.warn('No admin emails found');
      return new Response(JSON.stringify({ message: 'No admins to notify' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Envoyer l'email aux admins
    const emailResponse = await resend.emails.send({
      from: "IArche <onboarding@resend.dev>", // Remplacez par votre domaine vérifié
      to: adminEmails,
      subject: `Nouveau commentaire en attente - ${article.title}`,
      html: `
        <h1>Nouveau commentaire en attente de modération</h1>
        <p><strong>Article :</strong> ${article.title}</p>
        <p><strong>Auteur :</strong> ${author_name} (${author_email})</p>
        <p><strong>Commentaire :</strong></p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 16px; margin: 16px 0;">
          ${content}
        </blockquote>
        <p>
          <a href="https://iarche.fr/admin/comments" style="display: inline-block; padding: 10px 20px; background-color: #2754C5; color: white; text-decoration: none; border-radius: 5px;">
            Modérer le commentaire
          </a>
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Ce commentaire a été publié sur : 
          <a href="https://iarche.fr/actualites/${article.slug}">https://iarche.fr/actualites/${article.slug}</a>
        </p>
      `,
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-new-comment function:", error);
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
