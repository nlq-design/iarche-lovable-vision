// Shared Email Template - IArche Graphic Charter v4.0
// Colors: Night Blue #1A2B4A, Terracotta #B04A32, Off-white #FAF9F7

export const EMAIL_COLORS = {
  nightBlue: '#1A2B4A',
  terracotta: '#B04A32',
  offWhite: '#FAF9F7',
  textGray: '#374151',
  mutedGray: '#6B7280',
  lightGray: '#9CA3AF',
  borderGray: '#E5E7EB',
};

export const LOGO_URL = 'https://iarche.fr/logos/iarche-main.png';

// Generate standardized email header with logo and gradient
export function getEmailHeader(title: string): string {
  return `
    <!-- Header with gradient -->
    <tr>
      <td style="background: linear-gradient(135deg, ${EMAIL_COLORS.nightBlue} 0%, ${EMAIL_COLORS.terracotta} 100%); padding: 32px 40px; text-align: center; border-radius: 12px 12px 0 0;">
        <img src="${LOGO_URL}" alt="IArche" style="height: 40px; margin-bottom: 16px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
      </td>
    </tr>
  `;
}

// Generate standardized email footer with logo and contact info
export function getEmailFooter(): string {
  return `
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; background-color: ${EMAIL_COLORS.offWhite}; border-top: 1px solid ${EMAIL_COLORS.borderGray}; text-align: center; border-radius: 0 0 12px 12px;">
        <img src="${LOGO_URL}" alt="IArche" style="height: 28px; margin-bottom: 12px; opacity: 0.8;" />
        <p style="color: ${EMAIL_COLORS.lightGray}; font-size: 12px; margin: 0 0 8px 0;">
          IArche · Agence IA · Bayonne, France
        </p>
        <p style="margin: 0;">
          <a href="https://iarche.fr" style="color: ${EMAIL_COLORS.terracotta}; text-decoration: none; font-size: 12px; font-weight: 500;">iarche.fr</a>
          <span style="color: ${EMAIL_COLORS.lightGray}; margin: 0 8px;">·</span>
          <a href="mailto:nlq@iarche.fr" style="color: ${EMAIL_COLORS.nightBlue}; text-decoration: none; font-size: 12px;">nlq@iarche.fr</a>
        </p>
      </td>
    </tr>
  `;
}

// Generate complete email wrapper
export function wrapEmailContent(header: string, content: string, footer: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IArche</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${EMAIL_COLORS.offWhite}; line-height: 1.6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              ${header}
              <tr>
                <td style="padding: 32px 40px;">
                  ${content}
                </td>
              </tr>
              ${footer}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Generate a CTA button
export function getCtaButton(text: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = variant === 'primary' ? EMAIL_COLORS.terracotta : EMAIL_COLORS.nightBlue;
  return `
    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: ${bgColor}; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 8px;">
      ${text}
    </a>
  `;
}

// Generate info card
export function getInfoCard(content: string, accentColor: string = EMAIL_COLORS.terracotta): string {
  return `
    <div style="background-color: ${EMAIL_COLORS.offWhite}; border-left: 4px solid ${accentColor}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      ${content}
    </div>
  `;
}

// Generate signature
export function getSignature(): string {
  return `
    <p style="color: ${EMAIL_COLORS.mutedGray}; font-size: 14px; margin-top: 24px;">
      À bientôt,<br>
      <strong style="color: ${EMAIL_COLORS.nightBlue};">L'équipe IArche</strong>
    </p>
  `;
}
