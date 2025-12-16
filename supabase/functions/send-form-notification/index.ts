import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Fonction d'échappement HTML pour prévenir les injections XSS
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface FormNotificationRequest {
  form_id: string;
  form_title: string;
  form_fields?: FormField[];
  response_data: Record<string, any>;
  respondent_email?: string;
  admin_email?: string;
  send_to_respondent?: boolean;
  custom_subject?: string;
  custom_message?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - 10 requêtes max par IP par heure
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = await checkRateLimit(supabase, ipAddress, 'form-notification', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!allowed) {
      console.log('[send-form-notification] Rate limit exceeded for IP:', ipAddress);
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json', 
            ...corsHeaders, 
            ...getRateLimitHeaders(remaining, 10, 60) 
          } 
        }
      );
    }

    const {
      form_id,
      form_title,
      form_fields,
      response_data,
      respondent_email,
      admin_email,
      send_to_respondent,
      custom_subject,
      custom_message,
    }: FormNotificationRequest = await req.json();

    // Échapper le titre du formulaire
    const safeFormTitle = escapeHtml(form_title);

    console.log('[send-form-notification] Processing notification for form:', safeFormTitle);
    console.log('[send-form-notification] Form fields received:', JSON.stringify(form_fields));
    console.log('[send-form-notification] Respondent email received:', respondent_email);

    // Créer un mapping ID -> Label pour les champs
    const fieldLabelMap: Record<string, string> = {};
    if (form_fields && Array.isArray(form_fields) && form_fields.length > 0) {
      for (const field of form_fields) {
        if (field && field.id && field.label) {
          fieldLabelMap[field.id] = field.label;
          console.log('[send-form-notification] Mapped field:', field.id, '->', field.label);
        }
      }
    }
    console.log('[send-form-notification] Final field label map:', JSON.stringify(fieldLabelMap));

    // Trouver l'email du répondant dans les données si non fourni
    let finalRespondentEmail = respondent_email;
    if (!finalRespondentEmail && response_data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const [key, value] of Object.entries(response_data)) {
        if (typeof value === 'string' && emailRegex.test(value)) {
          finalRespondentEmail = value;
          console.log('[send-form-notification] Found email in response_data:', finalRespondentEmail, 'field:', key);
          break;
        }
      }
    }

    const adminEmailAddress = admin_email || 'nlq@iarche.fr';
    const results = { admin: false, respondent: false };
    // Toujours envoyer au répondant si on a trouvé un email
    const shouldSendToRespondent = !!finalRespondentEmail;
    
    console.log('[send-form-notification] Final respondent email:', finalRespondentEmail);
    console.log('[send-form-notification] Should send to respondent:', shouldSendToRespondent);

    // Construire le résumé des réponses en HTML avec les vrais labels (pour admin)
    const responseHtml = Object.entries(response_data)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        // Échapper le label du champ
        const fieldLabel = escapeHtml(fieldLabelMap[key] || key);
        
        let displayValue = '';
        if (typeof value === 'boolean') {
          displayValue = value ? 'Oui' : 'Non';
        } else if (Array.isArray(value)) {
          displayValue = escapeHtml(value.join(', '));
        } else {
          displayValue = escapeHtml(String(value));
        }
        
        if (displayValue.includes('_')) {
          displayValue = displayValue.replace(/_/g, ' ');
        }
        
        return `<tr>
          <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_COLORS.borderGray}; font-weight: 500; color: ${EMAIL_COLORS.textGray}; width: 35%;">${fieldLabel}</td>
          <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_COLORS.borderGray}; color: ${EMAIL_COLORS.mutedGray};">${displayValue}</td>
        </tr>`;
      })
      .join('');

    // Extraire les infos clés pour le prospect (nom, prénom)
    let prospectName = '';
    const nameLabels = ['nom', 'prénom', 'prenom', 'name', 'firstname', 'lastname', 'nom complet'];
    for (const [key, value] of Object.entries(response_data)) {
      const label = (fieldLabelMap[key] || key).toLowerCase();
      if (nameLabels.some(n => label.includes(n)) && typeof value === 'string' && value.trim()) {
        prospectName = prospectName ? `${prospectName} ${value}` : value;
      }
    }
    // Échapper le nom du prospect
    const safeProspectName = escapeHtml(prospectName) || 'vous';

    // Email admin (DÉTAILLÉ avec toutes les infos)
    try {
      const adminHeader = getEmailHeader('📝 Nouvelle soumission');
      const adminContent = `
        <p style="color: ${EMAIL_COLORS.mutedGray}; margin-bottom: 20px;">${safeFormTitle}</p>
        
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 500;">
            ⏰ Reçu le ${new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
          </p>
        </div>
        
        <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin-bottom: 12px; border-bottom: 2px solid ${EMAIL_COLORS.terracotta}; padding-bottom: 8px;">
          📋 Détail complet des réponses
        </h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: ${EMAIL_COLORS.offWhite}; border-radius: 8px;">
          ${responseHtml}
        </table>
        
        ${finalRespondentEmail ? `
        <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #065F46; font-size: 14px;">
            ✅ Email de confirmation envoyé à <strong>${escapeHtml(finalRespondentEmail)}</strong>
          </p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 24px;">
          ${getCtaButton('Voir toutes les réponses →', `https://iarche.fr/admin/formulaires/${escapeHtml(form_id)}/reponses`, 'secondary')}
        </div>
      `;
      const adminFooter = getEmailFooter();

      const adminEmailResponse = await resend.emails.send({
        from: 'IArche Formulaires <notifications@iarche.fr>',
        to: [adminEmailAddress],
        subject: `📝 Nouvelle réponse: ${safeFormTitle}`,
        html: wrapEmailContent(adminHeader, adminContent, adminFooter),
      });

      console.log('[send-form-notification] Admin email sent:', adminEmailResponse);
      results.admin = true;

      await logEmail({
        source_type: 'form',
        source_id: form_id,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: `Nouvelle réponse: ${safeFormTitle}`,
        status: 'sent',
      });
    } catch (emailError: any) {
      console.error('[send-form-notification] Admin email error:', emailError);
      await logEmail({
        source_type: 'form',
        source_id: form_id,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: `Nouvelle réponse: ${safeFormTitle}`,
        status: 'failed',
        error_message: emailError.message,
      });
    }

    // Email prospect (SUCCINCT - juste confirmation)
    if (shouldSendToRespondent && finalRespondentEmail) {
      try {
        const respondentSubject = custom_subject || `Merci ${safeProspectName} ! Votre demande a bien été reçue`;

        console.log('[send-form-notification] Sending confirmation to:', finalRespondentEmail);

        const respondentHeader = getEmailHeader(`Merci ${safeProspectName} !`);
        const respondentContent = `
          <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; line-height: 1.7; margin-bottom: 20px;">
            Nous avons bien reçu votre demande concernant <strong style="color: ${EMAIL_COLORS.nightBlue};">${safeFormTitle}</strong>.
          </p>
          
          <p style="color: ${EMAIL_COLORS.textGray}; font-size: 16px; line-height: 1.7; margin-bottom: 24px;">
            Notre équipe va prendre connaissance de vos informations et reviendra vers vous dans les meilleurs délais.
          </p>
          
          ${getInfoCard(`<p style="color: ${EMAIL_COLORS.nightBlue}; margin: 0; font-size: 15px; font-weight: 500;">
            💡 En attendant, découvrez nos solutions IA sur notre site
          </p>`)}
          
          <div style="text-align: center; margin: 24px 0;">
            ${getCtaButton('Découvrir nos solutions →', 'https://iarche.fr/solutions')}
          </div>
          
          <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 14px; line-height: 1.6; text-align: center;">
            Une question ? Contactez-nous à <a href="mailto:nlq@iarche.fr" style="color: ${EMAIL_COLORS.terracotta}; text-decoration: none; font-weight: 500;">nlq@iarche.fr</a>
          </p>
        `;
        const respondentFooter = getEmailFooter();

        const respondentEmailResponse = await resend.emails.send({
          from: 'IArche <contact@iarche.fr>',
          to: [finalRespondentEmail],
          subject: respondentSubject,
          html: wrapEmailContent(respondentHeader, respondentContent, respondentFooter),
        });

        console.log('[send-form-notification] Respondent email sent:', respondentEmailResponse);
        results.respondent = true;

        await logEmail({
          source_type: 'form',
          source_id: form_id,
          recipient_email: finalRespondentEmail,
          email_type: 'user_confirmation',
          subject: respondentSubject,
          status: 'sent',
        });
      } catch (emailError: any) {
        console.error('[send-form-notification] Respondent email error:', emailError);
        await logEmail({
          source_type: 'form',
          source_id: form_id,
          recipient_email: finalRespondentEmail!,
          email_type: 'user_confirmation',
          subject: custom_subject || `Confirmation - ${safeFormTitle}`,
          status: 'failed',
          error_message: emailError.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('[send-form-notification] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
