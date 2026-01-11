import { useMemo } from 'react';

// Email color constants (shared with CampaignEmailEditor)
const EMAIL_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  grey: '#6B7280',
  lightGrey: '#E5E7EB',
};

export type EmailTheme = 'bleu-nuit' | 'blanc-casse' | 'terracotta' | 'minimaliste';

const EMAIL_THEMES: Record<EmailTheme, {
  label: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
  footerBg: string;
  accent: string;
  logoSrc: string;
}> = {
  'bleu-nuit': {
    label: 'Bleu Nuit (Gradient)',
    headerBg: `linear-gradient(135deg, ${EMAIL_COLORS.bleuNuit} 0%, ${EMAIL_COLORS.terracotta} 100%)`,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'blanc-casse': {
    label: 'Blanc Cassé (Élégant)',
    headerBg: EMAIL_COLORS.blancCasse,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
  'terracotta': {
    label: 'Terracotta (Chaleureux)',
    headerBg: EMAIL_COLORS.terracotta,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.bleuNuit,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'minimaliste': {
    label: 'Minimaliste (Simple)',
    headerBg: EMAIL_COLORS.white,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.white,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
};

interface EmailPreviewRendererProps {
  bodyHtml: string;
  theme: EmailTheme;
  senderName?: string;
  subject?: string;
  previewVariables?: Record<string, string>;
  className?: string;
}

/**
 * Generates the complete email HTML with header, body, and footer.
 * This is the same template used for actual sending.
 */
export function generateFullEmailHtml(
  bodyHtml: string,
  theme: EmailTheme,
  senderName: string = 'IArche',
  previewVariables?: Record<string, string>
): string {
  const t = EMAIL_THEMES[theme] || EMAIL_THEMES['bleu-nuit'];
  const headerStyle = t.headerBg.startsWith('linear') 
    ? `background: ${t.headerBg};` 
    : `background-color: ${t.headerBg};`;

  // Replace variables with preview values if provided
  let processedBody = bodyHtml || '<p>Rédigez votre email ici...</p>';
  if (previewVariables) {
    Object.entries(previewVariables).forEach(([key, value]) => {
      processedBody = processedBody.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: ${t.bodyBg}; }
    .header { ${headerStyle} padding: 32px; text-align: center; }
    .header img { height: 40px; }
    .content { padding: 32px; color: ${t.bodyText}; line-height: 1.6; }
    .content h1, .content h2, .content h3 { color: ${EMAIL_COLORS.bleuNuit}; margin-top: 0; }
    .content a { color: ${t.accent}; }
    .button { display: inline-block; background: ${t.accent}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500; }
    .footer { background: ${t.footerBg}; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid ${EMAIL_COLORS.lightGrey}; }
    .footer p { color: ${EMAIL_COLORS.grey}; margin: 8px 0; }
    .footer a { color: ${t.accent}; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="background: #f4f4f4; padding: 20px 0;">
    <div class="container">
      <div class="header">
        <img src="${t.logoSrc}" alt="IArche" />
      </div>
      <div class="content">
        ${processedBody}
      </div>
      <div class="footer">
        <p>Envoyé par ${senderName} • IArche</p>
        <p><a href="{{unsubscribe_url}}">Se désinscrire</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Email preview component that renders the full themed email template.
 * Use this for consistent previews throughout the app.
 */
export function EmailPreviewRenderer({
  bodyHtml,
  theme,
  senderName = 'IArche',
  subject,
  previewVariables,
  className = '',
}: EmailPreviewRendererProps) {
  const fullHtmlEmail = useMemo(() => {
    return generateFullEmailHtml(bodyHtml, theme, senderName, previewVariables);
  }, [bodyHtml, theme, senderName, previewVariables]);

  return (
    <div className={`border rounded-lg overflow-hidden bg-gray-100 p-4 ${className}`}>
      {subject && (
        <div className="text-xs text-muted-foreground mb-2">
          Sujet : <strong>{subject}</strong>
        </div>
      )}
      <iframe
        srcDoc={fullHtmlEmail}
        className="w-full min-h-[500px] bg-white rounded border-0"
        title="Email Preview"
      />
    </div>
  );
}

export { EMAIL_THEMES, EMAIL_COLORS };
