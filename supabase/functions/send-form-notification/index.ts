import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';
import { trackAPIUsage } from '../_shared/api-tracker.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getCtaButton, getInfoCard, getSignature } from '../_shared/emailTemplate.ts';
import { formNotificationSchema, validateRequest, type FormNotificationRequest } from '../_shared/validation.ts';

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
  safeFormTitle: string,
  responseHtml: string,
  formId: string,
  finalRespondentEmail: string | null | undefined
): string => {
  return `
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
      ${getCtaButton('Voir toutes les réponses →', `https://iarche.fr/admin/formulaires/${escapeHtml(formId)}/reponses`, 'secondary')}
    </div>
  `;
};

// Template par défaut prospect
const getDefaultProspectTemplate = (
  safeProspectName: string,
  safeFormTitle: string
): string => {
  return `
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
};

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

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(formNotificationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
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
    } = validation.data;

    // Échapper le titre du formulaire
    const safeFormTitle = escapeHtml(form_title);

    console.log('[send-form-notification] Processing notification for form:', safeFormTitle);

    // Récupérer les templates depuis la BDD
    const { data: emailConfig } = await supabase
      .from('email_configurations')
      .select('admin_email_template, admin_email_subject, user_email_template, user_email_subject')
      .eq('source_type', 'form')
      .eq('source_id', form_id)
      .eq('is_active', true)
      .maybeSingle();

    // Si pas de config spécifique au form, chercher la config générique
    let finalEmailConfig = emailConfig;
    if (!emailConfig) {
      const { data: genericConfig } = await supabase
        .from('email_configurations')
        .select('admin_email_template, admin_email_subject, user_email_template, user_email_subject')
        .eq('source_type', 'form')
        .is('source_id', null)
        .eq('is_active', true)
        .maybeSingle();
      finalEmailConfig = genericConfig;
    }

    console.log('[send-form-notification] Email config found:', !!finalEmailConfig);

    // Créer un mapping ID -> Label pour les champs
    const fieldLabelMap: Record<string, string> = {};
    if (form_fields && Array.isArray(form_fields) && form_fields.length > 0) {
      for (const field of form_fields) {
        if (field && field.id && field.label) {
          fieldLabelMap[field.id] = field.label;
        }
      }
    }

    // Trouver l'email du répondant dans les données si non fourni
    let finalRespondentEmail = respondent_email;
    if (!finalRespondentEmail && response_data) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const [key, value] of Object.entries(response_data)) {
        if (typeof value === 'string' && emailRegex.test(value)) {
          finalRespondentEmail = value;
          break;
        }
      }
    }

    const adminEmailAddress = admin_email || 'nlq@iarche.fr';
    const results = { admin: false, respondent: false };
    const shouldSendToRespondent = !!finalRespondentEmail;

    // Construire le résumé des réponses en HTML
    const responseHtml = Object.entries(response_data)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
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

    // Extraire les infos clés pour le prospect
    let prospectName = '';
    const nameLabels = ['nom', 'prénom', 'prenom', 'name', 'firstname', 'lastname', 'nom complet'];
    for (const [key, value] of Object.entries(response_data)) {
      const label = (fieldLabelMap[key] || key).toLowerCase();
      if (nameLabels.some(n => label.includes(n)) && typeof value === 'string' && value.trim()) {
        prospectName = prospectName ? `${prospectName} ${value}` : value;
      }
    }
    const safeProspectName = escapeHtml(prospectName) || 'vous';

    // Variables pour les templates
    const templateVariables = {
      form_title: safeFormTitle,
      form_id: form_id,
      prospect_name: safeProspectName,
      respondent_email: finalRespondentEmail || '',
      response_details: responseHtml,
      date: new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }),
    };

    // Email admin (DÉTAILLÉ avec toutes les infos)
    try {
      let adminContent: string;
      let adminSubject = `📝 Nouvelle réponse: ${safeFormTitle}`;

      if (finalEmailConfig?.admin_email_template) {
        console.log('[send-form-notification] Using database template for admin');
        adminContent = replaceTemplateVariables(finalEmailConfig.admin_email_template, templateVariables);
        if (finalEmailConfig.admin_email_subject) {
          adminSubject = replaceTemplateVariables(finalEmailConfig.admin_email_subject, templateVariables);
        }
      } else {
        console.log('[send-form-notification] Using default template for admin');
        adminContent = getDefaultAdminTemplate(safeFormTitle, responseHtml, form_id, finalRespondentEmail);
      }

      const adminHeader = getEmailHeader('📝 Nouvelle soumission');
      const adminFooter = getEmailFooter();

      const adminEmailResponse = await resend.emails.send({
        from: 'IArche Formulaires <notifications@iarche.fr>',
        to: [adminEmailAddress],
        subject: adminSubject,
        html: wrapEmailContent(adminHeader, adminContent, adminFooter),
      });

      console.log('[send-form-notification] Admin email sent:', adminEmailResponse);
      results.admin = true;

      await logEmail({
        source_type: 'form',
        source_id: form_id,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: adminSubject,
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
        let respondentContent: string;
        let respondentSubject = custom_subject || `Merci ${safeProspectName} ! Votre demande a bien été reçue`;

        if (finalEmailConfig?.user_email_template) {
          console.log('[send-form-notification] Using database template for prospect');
          respondentContent = replaceTemplateVariables(finalEmailConfig.user_email_template, templateVariables);
          if (finalEmailConfig.user_email_subject) {
            respondentSubject = replaceTemplateVariables(finalEmailConfig.user_email_subject, templateVariables);
          }
        } else {
          console.log('[send-form-notification] Using default template for prospect');
          respondentContent = getDefaultProspectTemplate(safeProspectName, safeFormTitle);
        }

        const respondentHeader = getEmailHeader(`Merci ${safeProspectName} !`);
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

    // Track email API usage
    const emailsSent = (results.admin ? 1 : 0) + (results.respondent ? 1 : 0);
    if (emailsSent > 0) {
      try {
        await trackAPIUsage({
          workspaceId: '00000000-0000-0000-0000-000000000001',
          apiCategory: 'email',
          apiName: 'resend',
          providerName: 'resend',
          operationType: 'form-notification',
          requestCount: emailsSent,
          success: true,
          estimatedCostCents: emailsSent * 0.1,
          metadata: { form_id, admin_sent: results.admin, respondent_sent: results.respondent },
        });
      } catch (e) {
        console.error('[send-form-notification] Tracking error:', e);
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
