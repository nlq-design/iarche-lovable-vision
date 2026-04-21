/**
 * Transforme un `content_json` d'invitation en document HTML complet email-safe
 * (tables imbriquées, largeur 600px, styles inline, bgcolor solides, VML Outlook).
 *
 * Compatible Gmail, Outlook (Windows/Mac), Apple Mail, iOS Mail, Brevo.
 *
 * Niveau de fidélité : v3 — couleurs alignées sur tokens.ts (source unique de vérité),
 * terracotta officiel #B04A32, pills date/lieu rgba blanc 10%, badge shadcn-fidèle,
 * logos compacts (40px).
 */

import type {
  InvitationContentJson,
  InvitationMetadata,
  InvitationSection,
  ProgrammeRow,
  BuildEmailHtmlOptions,
} from './types';
import { sanitizeSectionHtml } from './sanitize';
import { EMAIL_ASSETS } from './assets';
import { COLORS } from '@/components/admin/medias/shared/tokens';

/* ── Constantes spécifiques au médium email (non présentes dans tokens.ts) ── */
const GRIS_SABLE = '#F0EDE8'; // Background body email uniquement
const PILL_FALLBACK_BG = '#2E3F5E'; // Fallback solide pour rgba(255,255,255,0.1) sur bleu nuit (Outlook)
const FONT_STACK = "'Helvetica Neue', Arial, sans-serif";

/* ── Helpers ── */

function escapeHtml(str: string | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string | undefined | null): string {
  return escapeHtml(str);
}

/* ── Blocs de rendu ── */

function renderHeroBlock(metadata: InvitationMetadata): string {
  const eventType = escapeHtml(metadata.eventType);
  const title = escapeHtml(metadata.eventTitle);
  const date = escapeHtml(metadata.eventDate);
  const location = escapeHtml(metadata.eventLocation);

  // Badge shadcn-fidèle : padding compact 4px 10px, border-radius 6px, sans uppercase ni letter-spacing
  const badgeHtml = eventType
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px auto;">
        <tr>
          <td bgcolor="${COLORS.terracotta}" style="padding:4px 10px; border-radius:6px; background-color:${COLORS.terracotta};">
            <span style="color:${COLORS.white}; font-size:13px; font-weight:600; font-family:${FONT_STACK};">${eventType}</span>
          </td>
        </tr>
      </table>`
    : '';

  // Pill date/lieu : rgba(255,255,255,0.1) en style inline, fallback solide PILL_FALLBACK_BG via bgcolor (Outlook)
  const datePill = date
    ? `<tr>
        <td style="padding:4px;" align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td bgcolor="${PILL_FALLBACK_BG}" style="padding:8px 16px; border-radius:9999px; background-color:rgba(255,255,255,0.1);">
                <span style="color:${COLORS.white}; font-size:14px; font-family:${FONT_STACK};">📅 ${date}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const locationPill = location
    ? `<tr>
        <td style="padding:4px;" align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td bgcolor="${PILL_FALLBACK_BG}" style="padding:8px 16px; border-radius:9999px; background-color:rgba(255,255,255,0.1);">
                <span style="color:${COLORS.white}; font-size:14px; font-family:${FONT_STACK};">📍 ${location}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const pillsTable =
    datePill || locationPill
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
          ${datePill}
          ${locationPill}
        </table>`
      : '';

  // Logo : height 40px (proche de h-8 = 32px de la page admin, légèrement augmenté pour l'email)
  const heroInner = `
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
      <tr>
        <td align="center" style="padding:40px 30px;">
          <img src="${escapeAttr(EMAIL_ASSETS.logo)}" alt="IArche" height="40" style="display:block; height:40px; width:auto; margin:0 auto 24px auto; border:0; outline:none; text-decoration:none;" />
          ${badgeHtml}
          <h1 style="margin:0 0 16px 0; color:${COLORS.white}; font-size:36px; line-height:1.15; font-weight:700; font-family:${FONT_STACK}; text-align:center;">${title}</h1>
          ${pillsTable}
        </td>
      </tr>
    </table>`;

  return `
  <tr>
    <td style="padding:0;">
      <!--[if mso]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
        <v:fill type="frame" src="${escapeAttr(EMAIL_ASSETS.heroBackground)}" color="${COLORS.bleuNuit}"/>
        <v:textbox inset="0,0,0,0">
      <![endif]-->
      <div style="background-color:${COLORS.bleuNuit}; background-image: url('${escapeAttr(EMAIL_ASSETS.heroBackground)}'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        ${heroInner}
      </div>
      <!--[if mso]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>`;
}

function renderSectionBlock(section: InvitationSection): string {
  const title = escapeHtml(section.title);
  const content = sanitizeSectionHtml(section.content || '');
  if (!title && !content) return '';

  return `
  <tr>
    <td style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLORS.blancCasse}" style="background-color:${COLORS.blancCasse}; border-left:4px solid ${COLORS.terracotta};">
        <tr>
          <td style="padding:20px 24px;">
            ${title ? `<h2 style="margin:0 0 12px 0; color:${COLORS.bleuNuit}; font-size:22px; font-weight:700; font-family:${FONT_STACK};">${title}</h2>` : ''}
            <div style="color:${COLORS.bleuNuit}; font-size:15px; line-height:1.6; font-family:${FONT_STACK};">${content}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderProgrammeBlock(rows: ProgrammeRow[]): string {
  const validRows = rows.filter((r) => r && r.horaire && r.theme);
  if (validRows.length === 0) return '';

  const headerCellStyle = `padding:12px; color:${COLORS.white}; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; font-family:${FONT_STACK};`;

  const headerHtml = `
    <tr>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Horaire</th>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Thème</th>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Intervenant</th>
    </tr>`;

  const rowsHtml = validRows
    .map((row) => {
      const baseCell = `padding:10px 12px; font-size:14px; border-bottom:1px solid ${GRIS_SABLE}; font-family:${FONT_STACK};`;
      return `
    <tr>
      <td bgcolor="${COLORS.white}" style="${baseCell} color:${COLORS.bleuNuit}; font-weight:600; white-space:nowrap;">${escapeHtml(row.horaire)}</td>
      <td bgcolor="${COLORS.white}" style="${baseCell} color:${COLORS.bleuNuit}; line-height:1.5;">${escapeHtml(row.theme)}</td>
      <td bgcolor="${COLORS.white}" style="${baseCell} color:${COLORS.terracotta}; font-weight:600;">${escapeHtml(row.intervenant)}</td>
    </tr>`;
    })
    .join('');

  return `
  <tr>
    <td style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLORS.blancCasse}" style="background-color:${COLORS.blancCasse}; border-left:4px solid ${COLORS.terracotta};">
        <tr>
          <td style="padding:20px 24px;">
            <h2 style="margin:0 0 16px 0; color:${COLORS.bleuNuit}; font-size:22px; font-weight:700; font-family:${FONT_STACK};">Programme détaillé</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              ${headerHtml}
              ${rowsHtml}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderQrBlock(publicUrl: string, qrCodeDataUrl: string | undefined): string {
  if (!qrCodeDataUrl) return '';
  const url = escapeAttr(publicUrl);
  const qr = escapeAttr(qrCodeDataUrl);
  const urlText = escapeHtml(publicUrl);
  return `
  <tr>
    <td style="padding:24px 30px 0 30px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLORS.bleuNuit}" style="background-color:${COLORS.bleuNuit};">
        <tr>
          <td align="center" style="padding:24px;">
            <h3 style="margin:0 0 16px 0; color:${COLORS.white}; font-size:18px; font-weight:600; font-family:${FONT_STACK};">Inscription en ligne</h3>
            <img src="${qr}" alt="QR Code inscription" width="140" style="display:block; width:140px; height:140px; background-color:${COLORS.white}; padding:8px; border-radius:6px; margin:0 auto 12px auto; border:0;" />
            <p style="margin:0; color:${COLORS.blancCasse}; font-size:12px; line-height:1.5; font-family:${FONT_STACK};">
              Scannez ou rendez-vous sur :<br>
              <a href="${url}" style="color:${COLORS.terracotta}; text-decoration:underline;">${urlText}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderCtaBlock(publicUrl: string): string {
  const url = escapeAttr(publicUrl);
  return `
  <tr>
    <td align="center" style="padding:24px 30px 32px 30px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px; v-text-anchor:middle; width:280px;" arcsize="12%" stroke="f" fillcolor="${COLORS.terracotta}">
        <w:anchorlock/>
        <center style="color:${COLORS.white}; font-family:${FONT_STACK}; font-size:16px; font-weight:bold;">S'inscrire à l'événement</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
        <tr>
          <td bgcolor="${COLORS.terracotta}" style="border-radius:6px; background-color:${COLORS.terracotta};">
            <a href="${url}" target="_blank" style="display:inline-block; padding:16px 36px; color:${COLORS.white}; text-decoration:none; font-size:16px; font-weight:600; border-radius:6px; font-family:${FONT_STACK};">S'inscrire à l'événement</a>
          </td>
        </tr>
      </table>
      <!--<![endif]-->
    </td>
  </tr>`;
}

function renderFooterBlock(metadata: InvitationMetadata): string {
  const footerText = escapeHtml(
    metadata.footerText || 'IArche — Intelligence Artificielle au service des entreprises',
  );
  return `
  <tr>
    <td bgcolor="${COLORS.bleuNuit}" align="center" style="padding:24px 30px; background-color:${COLORS.bleuNuit};">
      <img src="${escapeAttr(EMAIL_ASSETS.logo)}" alt="IArche" height="40" style="display:block; height:40px; width:auto; margin:0 auto 12px auto; border:0; outline:none; text-decoration:none;" />
      <p style="margin:0 0 8px 0; color:${COLORS.blancCasse}; font-size:12px; line-height:1.6; font-family:${FONT_STACK};">${footerText}</p>
      <p style="margin:0; color:${COLORS.blancCasse}; font-size:12px; font-family:${FONT_STACK};">
        <a href="https://iarche.fr" style="color:${COLORS.terracotta}; text-decoration:none;">iarche.fr</a>
        &nbsp;·&nbsp; L'IA se construit avec vous
      </p>
    </td>
  </tr>`;
}

/* ── Fonction principale ── */

export function buildEmailHtml(
  content: InvitationContentJson,
  options: BuildEmailHtmlOptions,
): string {
  const metadata = content.metadata || {};
  const sections = Array.isArray(content.sections) ? [...content.sections] : [];
  const programmeRows = content.modules?.programme?.rows || [];

  const sortedSections = sections
    .filter((s) => s.id !== 'hero')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let hasProgrammeInSections = false;
  const middleBlocks: string[] = [];
  for (const section of sortedSections) {
    if (section.id === 'programme') {
      hasProgrammeInSections = true;
      const block = renderProgrammeBlock(programmeRows);
      if (block) middleBlocks.push(block);
    } else {
      const block = renderSectionBlock(section);
      if (block) middleBlocks.push(block);
    }
  }

  if (!hasProgrammeInSections && programmeRows.length > 0) {
    const block = renderProgrammeBlock(programmeRows);
    if (block) middleBlocks.push(block);
  }

  const heroBlock = renderHeroBlock(metadata);
  const qrBlock = renderQrBlock(options.publicUrl, options.qrCodeDataUrl);
  const ctaBlock = renderCtaBlock(options.publicUrl);
  const footerBlock = renderFooterBlock(metadata);

  const title = escapeHtml(metadata.eventTitle || 'Invitation IArche');
  const preheaderParts = [metadata.eventTitle, metadata.eventDate, metadata.eventLocation]
    .filter(Boolean)
    .map((s) => escapeHtml(s as string))
    .join(' — ');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
<!--[if mso]>
<style type="text/css">
table { border-collapse: collapse; }
.outlook-fallback { display: block !important; }
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${GRIS_SABLE}; font-family:${FONT_STACK};">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${GRIS_SABLE};">${preheaderParts}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${GRIS_SABLE}" style="background-color:${GRIS_SABLE};">
  <tr>
    <td align="center" style="padding:20px 10px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLORS.white}" style="max-width:600px; background-color:${COLORS.white};">
        ${heroBlock}
        ${middleBlocks.join('\n')}
        ${qrBlock}
        ${ctaBlock}
        ${footerBlock}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
