import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';
import { userConfirmationSchema, validateRequest, type UserConfirmationRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Fonction d'échappement HTML pour prévenir les injections XSS
const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validation des URLs pour s'assurer qu'elles pointent vers des domaines de confiance
const validateFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const trustedDomains = ['iarche.fr', 'mgjyhlyrwnnioctkbdkk.supabase.co'];
    if (trustedDomains.some(domain => parsed.hostname.endsWith(domain))) {
      return url;
    }
    console.warn(`Untrusted file URL domain: ${parsed.hostname}`);
    return '';
  } catch {
    console.warn(`Invalid file URL: ${url}`);
    return '';
  }
};

// Fonction pour remplacer les variables dans un template
function replaceTemplateVariables(
  template: string, 
  data: {
    name: string;
    email: string;
    title: string;
    message: string;
    cta_url: string;
    cta_text: string;
    date: string;
    company: string;
    source_context: string;
    file_url: string;
  }
): string {
  return template
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{title\}\}/g, data.title)
    .replace(/\{\{message\}\}/g, data.message)
    .replace(/\{\{cta_url\}\}/g, data.cta_url)
    .replace(/\{\{cta_text\}\}/g, data.cta_text)
    .replace(/\{\{date\}\}/g, data.date)
    .replace(/\{\{company\}\}/g, data.company)
    .replace(/\{\{source_context\}\}/g, data.source_context)
    .replace(/\{\{file_url\}\}/g, data.file_url);
}

// Génère le contenu par défaut pour chaque type de source
const getDefaultEmailContent = (data: UserConfirmationRequest) => {
  const safeName = escapeHtml(data.name);
  const safeSourceContext = escapeHtml(data.source_context);
  const safeLivreBlanctitle = escapeHtml(data.livre_blanc_title);
  const safeFileUrl = validateFileUrl(data.file_url);
  // Subjects email = texte brut (pas HTML), ne pas utiliser escapeHtml
  const rawSourceContext = data.source_context;

  const header = (title: string) => getEmailHeader(title);
  const footer = getEmailFooter();

  switch (data.source_type) {
    case 'contact':
      return {
        subject: '✅ Demande reçue · IArche',
        html: wrapEmailContent(
          header('Demande reçue !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Nous avons bien reçu votre message${safeSourceContext ? ` concernant "${safeSourceContext}"` : ''}.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Notre équipe vous répondra dans les plus brefs délais, généralement sous 24h.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'solution-contact':
      return {
        subject: `✅ Demande pour ${safeSourceContext || 'nos solutions'} · IArche`,
        html: wrapEmailContent(
          header('Demande reçue !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Nous avons bien reçu votre demande concernant <strong>${safeSourceContext || 'nos solutions'}</strong>.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Un membre de notre équipe vous contactera rapidement pour organiser une présentation personnalisée.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'livre-blanc':
      return {
        subject: `📚 Votre livre blanc : ${safeLivreBlanctitle || 'Document'}`,
        html: wrapEmailContent(
          header('Votre livre blanc est prêt !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">Merci pour votre intérêt ! Voici votre livre blanc :</p>
            
            ${getInfoCard(`<h3 style="margin: 0 0 12px 0; font-size: 18px; color: ${EMAIL_COLORS.nightBlue};">${safeLivreBlanctitle || 'Document'}</h3>
            ${safeFileUrl ? `<div style="text-align: center; margin-top: 12px;">${getCtaButton('📥 Télécharger le PDF', safeFileUrl)}</div>` : ''}`)}
            
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-top: 24px;">Bonne lecture ! N'hésitez pas à nous contacter si vous avez des questions.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'newsletter':
      return {
        subject: '🎉 Bienvenue dans la communauté IArche !',
        html: wrapEmailContent(
          header('Bienvenue dans la communauté IArche !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 20px;">
              Merci de rejoindre notre newsletter ! Vous faites désormais partie d'une communauté de dirigeants qui souhaitent intégrer l'IA de manière pragmatique dans leur entreprise.
            </p>
            
            ${getInfoCard(`
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: ${EMAIL_COLORS.nightBlue};">📬 Ce que vous allez recevoir</h3>
              <ul style="color: ${EMAIL_COLORS.textGray}; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Veille technologique</strong> · L'essentiel des actualités IA</li>
                <li><strong>Conseils pratiques</strong> · Des applications concrètes pour votre PME</li>
                <li><strong>Retours d'expérience</strong> · Cas d'usage réels et résultats mesurables</li>
                <li><strong>Invitations exclusives</strong> · Ateliers, webinaires et événements</li>
              </ul>
            `, EMAIL_COLORS.terracotta)}
            
            <div style="text-align: center; margin: 28px 0;">
              ${getCtaButton('Découvrir nos ressources', 'https://iarche.fr/ressources')}
            </div>
            
            <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 14px; margin-top: 24px; text-align: center;">
              Envoi mensuel · Désinscription en un clic · Pas de spam
            </p>
            
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'atelier-webinaire':
      return {
        subject: `🎓 Inscription confirmée : ${safeSourceContext || 'Atelier IArche'}`,
        html: wrapEmailContent(
          header('Inscription confirmée !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Votre inscription à <strong>${safeSourceContext || 'notre atelier'}</strong> est confirmée !</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Vous recevrez un rappel avec le lien de connexion avant l'événement.</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    case 'booking':
      return {
        subject: `✅ Rendez-vous confirmé : ${safeSourceContext || 'IArche'}`,
        html: wrapEmailContent(
          header('Rendez-vous confirmé !'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour <strong>${safeName}</strong>,</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Votre rendez-vous <strong>${safeSourceContext || ''}</strong> est bien confirmé.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 24px;">Vous recevrez une invitation Google Calendar avec le lien de visioconférence.</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">À très bientôt !</p>
            ${getSignature()}
          `,
          footer
        ),
      };

    default:
      return {
        subject: '✅ Confirmation · IArche',
        html: wrapEmailContent(
          header('Confirmation'),
          `
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; margin-bottom: 16px;">Bonjour ${safeName},</p>
            <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px;">Nous avons bien reçu votre demande.</p>
            ${getSignature()}
          `,
          footer
        ),
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = await checkRateLimit(supabase, clientIP, 'user-confirmation', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...getRateLimitHeaders(remaining, 10, 60),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(userConfirmationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const data = validation.data;
    console.log(`Sending user confirmation to ${data.email} for source: ${data.source_type}`);

    // Récupérer le template personnalisé depuis la base de données
    const { data: emailConfig } = await supabase
      .from('email_configurations')
      .select('user_email_template, user_email_subject')
      .eq('source_type', data.source_type)
      .eq('is_active', true)
      .single();

    console.log('Email config found:', !!emailConfig?.user_email_template);

    let emailContent: { subject: string; html: string };

    if (emailConfig?.user_email_template) {
      // Template personnalisé depuis la DB
      const safeName = escapeHtml(data.name);
      const safeSourceContext = escapeHtml(data.source_context);
      const safeLivreBlanctitle = escapeHtml(data.livre_blanc_title);
      const safeFileUrl = validateFileUrl(data.file_url);
      
      const templateData = {
        name: safeName,
        email: escapeHtml(data.email),
        title: safeLivreBlanctitle || safeSourceContext || 'Confirmation',
        message: 'Nous avons bien reçu votre demande.',
        cta_url: 'https://iarche.fr',
        cta_text: 'Visiter notre site',
        date: new Date().toLocaleDateString('fr-FR'),
        company: '',
        source_context: safeSourceContext,
        file_url: safeFileUrl,
      };

      emailContent = {
        html: replaceTemplateVariables(emailConfig.user_email_template, templateData),
        subject: emailConfig.user_email_subject 
          ? replaceTemplateVariables(emailConfig.user_email_subject, templateData)
          : getDefaultEmailContent(data).subject,
      };
      console.log('Using custom template from DB');
    } else {
      // Template par défaut
      emailContent = getDefaultEmailContent(data);
      console.log('Using default template');
    }

    const { data: emailData, error } = await resend.emails.send({
      from: 'IArche <contact@iarche.fr>',
      to: [data.email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('Error sending user confirmation:', error);
      
      await logEmail({
        recipient_email: data.email,
        subject: emailContent.subject,
        source_type: data.source_type,
        email_type: 'user_confirmation',
        source_id: data.source_id,
        status: 'failed',
        error_message: error.message,
        metadata: { name: data.name, source_context: data.source_context }
      });

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User confirmation sent successfully:', emailData);

    await logEmail({
      recipient_email: data.email,
      subject: emailContent.subject,
      source_type: data.source_type,
      email_type: 'user_confirmation',
      source_id: data.source_id,
      status: 'sent',
      metadata: { name: data.name, source_context: data.source_context, resend_id: emailData?.id }
    });

    return new Response(
      JSON.stringify({ success: true, email_id: emailData?.id }),
      { 
        headers: { 
          ...corsHeaders, 
          ...getRateLimitHeaders(remaining, 10, 60),
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in send-user-confirmation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});