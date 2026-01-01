import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { checkGeoBlocking, getGeoBlockingHeaders } from '../_shared/geoBlock.ts';
import { logEmail } from '../_shared/emailLogger.ts';
import { EMAIL_COLORS, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton } from '../_shared/emailTemplate.ts';

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

// Fonction d'échappement HTML pour prévenir les attaques XSS dans les emails
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Remplacer les variables dans le template
const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

// Template par défaut admin
const getDefaultAdminTemplate = (
  safeArticleTitle: string,
  safeAuthorName: string,
  safeAuthorEmail: string,
  safeContent: string,
  articleSlug: string
): string => {
  return `
    <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">
      Un nouveau commentaire a été posté et attend votre modération.
    </p>
    
    <div style="background: ${EMAIL_COLORS.offWhite}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; color: ${EMAIL_COLORS.mutedGray}; font-size: 14px;">
        <strong>Article :</strong> ${safeArticleTitle}
      </p>
      <p style="margin: 0 0 8px 0; color: ${EMAIL_COLORS.mutedGray}; font-size: 14px;">
        <strong>Auteur :</strong> ${safeAuthorName} (${safeAuthorEmail})
      </p>
    </div>
    
    <div style="background: #f9fafb; border-left: 4px solid ${EMAIL_COLORS.terracotta}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; color: ${EMAIL_COLORS.nightBlue}; font-size: 14px; font-weight: 600;">
        Commentaire :
      </p>
      <p style="margin: 0; color: ${EMAIL_COLORS.textGray}; font-size: 15px; white-space: pre-wrap; line-height: 1.6;">
        ${safeContent}
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 24px;">
      ${getCtaButton('Modérer le commentaire', 'https://iarche.fr/admin/comments')}
    </div>
    
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 12px; text-align: center;">
      Ce commentaire a été publié sur : 
      <a href="https://iarche.fr/actualites/${articleSlug}" style="color: ${EMAIL_COLORS.terracotta};">
        https://iarche.fr/actualites/${articleSlug}
      </a>
    </p>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification du géo-blocage
    const geoResult = await checkGeoBlocking(req);
    const geoHeaders = getGeoBlockingHeaders(geoResult);

    if (!geoResult.allowed) {
      console.warn('Geo-blocking triggered:', geoResult);
      return new Response(
        JSON.stringify({ 
          error: 'Access denied from your location',
          country: geoResult.country 
        }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...geoHeaders
          } 
        }
      );
    }

    // Rate limiting: 10 requêtes par IP par 5 minutes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      clientIP,
      'notify-new-comment',
      { maxRequests: 10, windowMinutes: 5 }
    );

    const rateLimitHeaders = getRateLimitHeaders(
      rateLimitResult.remaining,
      10,
      5
    );

    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for IP:', clientIP);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: 5 * 60 
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(5 * 60),
            ...corsHeaders,
            ...rateLimitHeaders
          } 
        }
      );
    }

    const { comment_id, article_id, author_name, author_email, content }: CommentNotificationRequest = await req.json();

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

    // Échapper le contenu pour prévenir les attaques XSS
    const safeAuthorName = escapeHtml(author_name);
    const safeAuthorEmail = escapeHtml(author_email);
    const safeContent = escapeHtml(content);
    const safeArticleTitle = escapeHtml(article.title);

    // Récupérer le template depuis la BDD
    const { data: emailConfig } = await supabaseAdmin
      .from('email_configurations')
      .select('admin_email_template, admin_email_subject')
      .eq('source_type', 'comment')
      .eq('is_active', true)
      .maybeSingle();

    console.log('[notify-new-comment] Email config found:', !!emailConfig);

    // Variables pour le template
    const templateVariables = {
      article_title: safeArticleTitle,
      article_slug: article.slug,
      author_name: safeAuthorName,
      author_email: safeAuthorEmail,
      comment_content: safeContent,
      date: new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }),
    };

    // Utiliser le template BDD ou le template par défaut
    let emailContent: string;
    let emailSubject = `Nouveau commentaire en attente - ${safeArticleTitle}`;

    if (emailConfig?.admin_email_template) {
      console.log('[notify-new-comment] Using database template for admin');
      emailContent = replaceTemplateVariables(emailConfig.admin_email_template, templateVariables);
      if (emailConfig.admin_email_subject) {
        emailSubject = replaceTemplateVariables(emailConfig.admin_email_subject, templateVariables);
      }
    } else {
      console.log('[notify-new-comment] Using default template for admin');
      emailContent = getDefaultAdminTemplate(safeArticleTitle, safeAuthorName, safeAuthorEmail, safeContent, article.slug);
    }

    const header = getEmailHeader('💬 Nouveau commentaire');
    const footer = getEmailFooter();

    // Envoyer l'email aux admins
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "IArche Notifications <notifications@iarche.fr>",
      to: adminEmails,
      replyTo: 'nlq@nlq.fr',
      subject: emailSubject,
      html: wrapEmailContent(header, emailContent, footer),
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      
      // Log failed email for each admin
      for (const adminEmail of adminEmails) {
        await logEmail({
          recipient_email: adminEmail,
          subject: emailSubject,
          source_type: 'comment',
          email_type: 'admin_notification',
          source_id: comment_id,
          status: 'failed',
          error_message: emailError.message,
          metadata: { article_id, author_name, author_email }
        });
      }

      throw new Error(emailError.message);
    }

    console.log("Notification email sent successfully:", emailResponse);

    // Log successful email for each admin
    for (const adminEmail of adminEmails) {
      await logEmail({
        recipient_email: adminEmail,
        subject: emailSubject,
        source_type: 'comment',
        email_type: 'admin_notification',
        source_id: comment_id,
        status: 'sent',
        metadata: { article_id, author_name, author_email, resend_id: emailResponse?.id }
      });
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...rateLimitHeaders
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
