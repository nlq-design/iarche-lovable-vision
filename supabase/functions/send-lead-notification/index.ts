import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logEmail } from '../_shared/emailLogger.ts';
import { trackAPIUsage } from '../_shared/api-tracker.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimit.ts';
import { EMAIL_COLORS, LOGO_URL, getEmailHeader, getEmailFooter, wrapEmailContent, getInfoCard } from '../_shared/emailTemplate.ts';
import { leadNotificationSchema, validateRequest } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// HTML escape function to prevent XSS
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Configuration par source
const SOURCE_CONFIG: Record<string, { 
  emoji: string; 
  label: string; 
  color: string; 
  bgColor: string; 
  textColor: string;
  headerTitle: string;
  ctaLabel: string;
  ctaUrl: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  'contact': {
    emoji: '✉️',
    label: 'Formulaire de Contact',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    textColor: '#1E40AF',
    headerTitle: '✉️ Nouveau message de contact',
    ctaLabel: 'Voir tous les contacts →',
    ctaUrl: 'https://iarche.fr/admin/contacts',
    priority: 'high'
  },
  'solution_detail': {
    emoji: '🚀',
    label: 'Demande Solution',
    color: '#B04A32',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
    headerTitle: '🚀 Intérêt pour une solution',
    ctaLabel: 'Voir les leads solutions →',
    ctaUrl: 'https://iarche.fr/admin/leads?source=solution',
    priority: 'high'
  },
  'solution-contact': {
    emoji: '🚀',
    label: 'Demande Solution',
    color: '#B04A32',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
    headerTitle: '🚀 Intérêt pour une solution',
    ctaLabel: 'Voir les leads solutions →',
    ctaUrl: 'https://iarche.fr/admin/leads?source=solution',
    priority: 'high'
  },
  'livre-blanc': {
    emoji: '📚',
    label: 'Téléchargement Livre Blanc',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    textColor: '#5B21B6',
    headerTitle: '📚 Téléchargement ressource',
    ctaLabel: 'Voir les téléchargements →',
    ctaUrl: 'https://iarche.fr/admin/livre-blancs-inscriptions',
    priority: 'medium'
  },
  'atelier-webinaire': {
    emoji: '🎓',
    label: 'Inscription Atelier/Webinaire',
    color: '#10B981',
    bgColor: '#D1FAE5',
    textColor: '#065F46',
    headerTitle: '🎓 Nouvelle inscription événement',
    ctaLabel: 'Gérer les inscriptions →',
    ctaUrl: 'https://iarche.fr/admin/atelier-inscriptions',
    priority: 'high'
  },
  'newsletter': {
    emoji: '📬',
    label: 'Inscription Newsletter',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
    headerTitle: '📬 Nouvel abonné newsletter',
    ctaLabel: 'Gérer les abonnés →',
    ctaUrl: 'https://iarche.fr/admin/newsletters',
    priority: 'low'
  },
  'formulaire': {
    emoji: '📝',
    label: 'Soumission Formulaire',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    textColor: '#3730A3',
    headerTitle: '📝 Nouvelle réponse formulaire',
    ctaLabel: 'Voir les réponses →',
    ctaUrl: 'https://iarche.fr/admin/formulaires',
    priority: 'medium'
  }
};

// Fonction pour remplacer les variables dans un template
function replaceTemplateVariables(
  template: string, 
  data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    source: string;
    source_context?: string;
    message?: string;
    lead_id?: string;
    cta_url: string;
    event_date?: string;
    event_location?: string;
  }
): string {
  const now = new Date().toLocaleString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit', 
    timeZone: 'Europe/Paris' 
  });
  
  return template
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{company\}\}/g, data.company || 'Non renseigné')
    .replace(/\{\{phone\}\}/g, data.phone || 'Non renseigné')
    .replace(/\{\{source\}\}/g, data.source)
    .replace(/\{\{source_context\}\}/g, data.source_context || '')
    .replace(/\{\{message\}\}/g, data.message || 'Aucun message')
    .replace(/\{\{date\}\}/g, now)
    .replace(/\{\{lead_id\}\}/g, data.lead_id || '')
    .replace(/\{\{cta_url\}\}/g, data.cta_url)
    .replace(/\{\{event_date\}\}/g, data.event_date || '')
    .replace(/\{\{event_location\}\}/g, data.event_location || '');
}

// Génère le template par défaut si aucun template personnalisé n'est défini
function generateDefaultTemplate(
  source: string,
  data: {
    safeName: string;
    safeEmail: string;
    safeCompany: string;
    safePhone: string;
    safeSourceContext: string;
    safeMessage: string;
    safeLeadId: string;
    eventDetailsHtml: string;
  }
): string {
  const config = SOURCE_CONFIG[source] || {
    emoji: '🎯',
    label: source || 'Lead',
    color: EMAIL_COLORS.terracotta,
    bgColor: '#FEF3C7',
    textColor: '#92400E',
    headerTitle: '🎯 Nouveau Lead',
    ctaLabel: 'Voir les leads →',
    ctaUrl: 'https://iarche.fr/admin/leads',
    priority: 'medium' as const
  };

  const priorityBadge = config.priority === 'high' 
    ? '<span style="background: #DC2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px;">PRIORITAIRE</span>'
    : config.priority === 'medium'
    ? '<span style="background: #F59E0B; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px;">À TRAITER</span>'
    : '';

  const messageSection = data.safeMessage ? `
    <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 20px 0 12px 0;">💬 Message</h3>
    ${getInfoCard(`<p style="margin: 0; white-space: pre-wrap; color: ${EMAIL_COLORS.textGray};">${data.safeMessage}</p>`)}
  ` : '';

  const contextInfo = data.safeSourceContext ? `<p style="margin: 5px 0;"><strong>Contexte:</strong> ${data.safeSourceContext}</p>` : '';

  const header = getEmailHeader(config.headerTitle);
  const content = `
    <div style="background: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: ${config.textColor}; font-size: 14px; font-weight: 500;">
        ${config.emoji} ${config.label} ${priorityBadge}
      </p>
      <p style="margin: 4px 0 0 0; color: ${config.textColor}; font-size: 12px; opacity: 0.8;">
        Reçu le ${new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
      </p>
    </div>
    
    <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 0 0 12px 0;">👤 Informations</h3>
    ${getInfoCard(`
      <p style="margin: 5px 0;"><strong>Nom:</strong> ${data.safeName}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${data.safeEmail}" style="color: ${EMAIL_COLORS.terracotta}; font-weight: 500;">${data.safeEmail}</a></p>
      ${data.safeCompany ? `<p style="margin: 5px 0;"><strong>Société:</strong> ${data.safeCompany}</p>` : ''}
      ${data.safePhone ? `<p style="margin: 5px 0;"><strong>Téléphone:</strong> <a href="tel:${data.safePhone}" style="color: ${EMAIL_COLORS.terracotta};">${data.safePhone}</a></p>` : ''}
      ${contextInfo}
    `)}
    
    ${messageSection}
    ${data.eventDetailsHtml}
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${config.ctaUrl}" style="display: inline-block; background: ${config.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
        ${config.ctaLabel}
      </a>
    </div>
    
    <p style="color: ${EMAIL_COLORS.lightGray}; font-size: 11px; margin-top: 24px; text-align: center;">
      Lead ID: <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${data.safeLeadId}</code>
    </p>
  `;
  const footer = getEmailFooter();
  
  return wrapEmailContent(header, content, footer);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, remaining } = await checkRateLimit(supabaseAdmin, clientIP, 'lead-notification', {
      maxRequests: 10,
      windowMinutes: 60
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(remaining, 10, 60)
          } 
        }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validation = validateRequest(leadNotificationSchema, rawData, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }
    
    const { lead_id, name, email, company, phone, source, source_context, message, event_details } = validation.data;
    console.log('Sending lead notification for:', lead_id);

    // Escape all user-provided data
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCompany = escapeHtml(company);
    const safePhone = escapeHtml(phone);
    const safeSourceContext = escapeHtml(source_context);
    const safeMessage = escapeHtml(message);
    const safeLeadId = escapeHtml(lead_id);

    // Récupérer la config email depuis la base (templates + destinataires)
    const { data: emailConfig } = await supabaseAdmin
      .from('email_configurations')
      .select('admin_email_template, admin_email_subject, admin_emails, send_admin_notification')
      .eq('source_type', source)
      .eq('is_active', true)
      .maybeSingle();

    console.log('Email config found:', !!emailConfig?.admin_email_template);

    // Détails événement pour ateliers
    let eventDetailsHtml = '';
    let eventDate = '';
    let eventLocation = '';
    if (source === 'atelier-webinaire' && event_details) {
      const safeLocation = escapeHtml(event_details.location);
      const safeHeureDebut = escapeHtml(event_details.heure_debut);
      const safeTypeEvenement = escapeHtml(event_details.type_evenement);
      const formattedDate = event_details.date ? new Date(event_details.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

      eventDate = formattedDate + (safeHeureDebut ? ` à ${safeHeureDebut}` : '');
      eventLocation = safeLocation || '';

      eventDetailsHtml = `
        <h3 style="color: ${EMAIL_COLORS.nightBlue}; font-size: 16px; margin: 20px 0 12px 0;">📅 Détails de l'événement</h3>
        ${getInfoCard(`
          ${formattedDate ? `<p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}${safeHeureDebut ? ` à ${safeHeureDebut}` : ''}</p>` : ''}
          ${safeLocation ? `<p style="margin: 5px 0;"><strong>Lieu:</strong> ${safeLocation}</p>` : ''}
          ${safeTypeEvenement ? `<p style="margin: 5px 0;"><strong>Format:</strong> ${safeTypeEvenement}</p>` : ''}
        `)}
      `;
    }

    const config = SOURCE_CONFIG[source] || {
      emoji: '🎯',
      label: source || 'Lead',
      color: EMAIL_COLORS.terracotta,
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      headerTitle: '🎯 Nouveau Lead',
      ctaLabel: 'Voir les leads →',
      ctaUrl: 'https://iarche.fr/admin/leads',
      priority: 'medium' as const
    };

    // Utiliser le template personnalisé ou le template par défaut
    let emailHtml: string;
    let emailSubject: string;

    if (emailConfig?.admin_email_template) {
      // Template personnalisé depuis la DB
      emailHtml = replaceTemplateVariables(emailConfig.admin_email_template, {
        name: safeName,
        email: safeEmail,
        company: safeCompany,
        phone: safePhone,
        source,
        source_context: safeSourceContext,
        message: safeMessage,
        lead_id: safeLeadId,
        cta_url: config.ctaUrl,
        event_date: eventDate,
        event_location: eventLocation,
      });
      emailSubject = emailConfig.admin_email_subject
        ? replaceTemplateVariables(emailConfig.admin_email_subject, {
            name: safeName,
            email: safeEmail,
            source,
            source_context: safeSourceContext,
            cta_url: config.ctaUrl,
          })
        : `${config.emoji} ${safeName} - ${config.label}`;
      console.log('Using custom template from DB');
    } else {
      // Template par défaut
      emailHtml = generateDefaultTemplate(source, {
        safeName,
        safeEmail,
        safeCompany,
        safePhone,
        safeSourceContext,
        safeMessage,
        safeLeadId,
        eventDetailsHtml,
      });
      emailSubject = `${config.emoji} ${safeName} - ${config.label}`;
      console.log('Using default template');
    }

    // Respecter un éventuel flag de désactivation des notifications admin
    if (emailConfig?.send_admin_notification === false) {
      console.log('Admin notification disabled for source:', source);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'admin_notification_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Destinataires admin:
    // 1) si configurés dans email_configurations.admin_emails -> on les utilise
    // 2) sinon -> emails des utilisateurs ayant le rôle 'admin'
    const configuredAdminEmails: string[] = Array.isArray(emailConfig?.admin_emails)
      ? (emailConfig!.admin_emails as string[]).map(e => (e || '').trim()).filter(Boolean)
      : [];

    let adminEmails: string[] = configuredAdminEmails;

    if (adminEmails.length === 0) {
      const { data: adminRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) {
        console.error('Error fetching admin roles:', rolesError);
        adminEmails = [];
      } else {
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        if (usersError) {
          console.error('Error fetching users:', usersError);
          adminEmails = [];
        } else {
          const adminUserIds = (adminRoles || []).map(r => r.user_id);
          adminEmails = (users || [])
            .filter(u => adminUserIds.includes(u.id))
            .map(u => u.email)
            .filter((email): email is string => !!email);
        }
      }
    }

    if (adminEmails.length === 0) {
      console.warn('No admin recipients resolved for lead notification');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'no_admin_recipients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'IArche Notifications <notifications@iarche.fr>',
      to: adminEmails,
      reply_to: 'nlq@nlq.fr',
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending lead notification email:', error);

      // Log failed email for each admin recipient
      for (const recipient of adminEmails) {
        await logEmail({
          recipient_email: recipient,
          subject: emailSubject,
          source_type: source,
          email_type: 'admin_notification',
          source_id: lead_id || undefined,
          status: 'failed',
          error_message: error.message,
          metadata: { name, email, company, phone, source_context }
        });
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead notification email sent successfully:', data);

    // Track email API usage
    try {
      await trackAPIUsage({
        workspaceId: '00000000-0000-0000-0000-000000000001',
        apiCategory: 'email',
        apiName: 'resend',
        providerName: 'resend',
        operationType: 'lead-notification',
        requestCount: adminEmails.length,
        success: true,
        estimatedCostCents: adminEmails.length * 0.1,
        metadata: { source, lead_id, recipients: adminEmails.length },
      });
    } catch (e) {
      console.error('[send-lead-notification] Tracking error:', e);
    }

    // Log success email for each admin recipient
    for (const recipient of adminEmails) {
      await logEmail({
        recipient_email: recipient,
        subject: emailSubject,
        source_type: source,
        email_type: 'admin_notification',
        source_id: lead_id || undefined,
        status: 'sent',
        metadata: { name, email, company, phone, source_context, resend_id: data?.id }
      });
    }

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id, recipients: adminEmails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-lead-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});