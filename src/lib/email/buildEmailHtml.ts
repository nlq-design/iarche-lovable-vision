/**
 * Transforme un `content_json` d'invitation en document HTML complet email-safe
 * (tables imbriquées, largeur 600px, styles inline, bgcolor solides).
 *
 * Compatible Gmail, Outlook (Windows/Mac), Apple Mail, Yahoo, Brevo.
 */

import type {
  InvitationContentJson,
  InvitationMetadata,
  InvitationSection,
  ProgrammeRow,
  BuildEmailHtmlOptions,
} from './types';
import { sanitizeSectionHtml } from './sanitize';

/* ── Couleurs IArche strictes (HEX, requis pour clients email) ── */
const COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#D15A3E',
  blancCasse: '#FAF9F7',
  grisSable: '#F0EDE8',
  blanc: '#FFFFFF',
} as const;

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

  const badgeHtml = eventType
    ? `<p style="margin:0 0 20px 0;">
        <span style="display:inline-block; background:${COLORS.terracotta}; color:${COLORS.blanc}; padding:6px 16px; border-radius:20px; font-size:12px; font-weight:600; letter-spacing:1px; font-family:${FONT_STACK};">${eventType}</span>
      </p>`
    : '';

  const dateLine = date ? `📅 ${date}` : '';
  const locationLine = location ? `📍 ${location}` : '';
  const sep = dateLine && locationLine ? '<br>' : '';

  return `
  <tr>
    <td bgcolor="${COLORS.bleuNuit}" align="center" style="padding:40px 30px; color:${COLORS.blanc}; font-family:${FONT_STACK};">
      <p style="margin:0 0 12px 0; color:${COLORS.blancCasse}; font-size:14px; font-weight:600; letter-spacing:2px; text-transform:uppercase; font-family:${FONT_STACK};">IArche</p>
      ${badgeHtml}
      <h1 style="margin:0 0 24px 0; color:${COLORS.blanc}; font-size:28px; line-height:1.3; font-weight:700; font-family:${FONT_STACK};">${title}</h1>
      <p style="margin:0; color:${COLORS.blancCasse}; font-size:14px; line-height:1.6; font-family:${FONT_STACK};">
        ${dateLine}${sep}${locationLine}
      </p>
    </td>
  </tr>`;
}

function renderSectionBlock(section: InvitationSection): string {
  const title = escapeHtml(section.title);
  const content = sanitizeSectionHtml(section.content || '');
  if (!title && !content) return '';

  return `
  <tr>
    <td style="padding:30px 40px; color:${COLORS.bleuNuit}; font-size:15px; line-height:1.6; font-family:${FONT_STACK};">
      ${title ? `<h2 style="margin:0 0 16px 0; color:${COLORS.bleuNuit}; font-size:20px; font-weight:700; border-left:4px solid ${COLORS.terracotta}; padding-left:12px; font-family:${FONT_STACK};">${title}</h2>` : ''}
      <div style="color:${COLORS.bleuNuit}; font-family:${FONT_STACK};">${content}</div>
    </td>
  </tr>`;
}

function renderProgrammeBlock(rows: ProgrammeRow[]): string {
  const validRows = rows.filter(r => r && r.horaire && r.theme);
  if (validRows.length === 0) return '';

  const headerCellStyle = `padding:10px; color:${COLORS.blanc}; font-size:13px; font-weight:600; font-family:${FONT_STACK};`;

  const headerHtml = `
    <tr>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Horaire</th>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Thème</th>
      <th bgcolor="${COLORS.bleuNuit}" align="left" style="${headerCellStyle}">Intervenant</th>
    </tr>`;

  const rowsHtml = validRows.map((row, idx) => {
    const bg = idx % 2 === 0 ? COLORS.blancCasse : COLORS.blanc;
    const cellStyle = `padding:10px; color:${COLORS.bleuNuit}; font-size:14px; border-bottom:1px solid ${COLORS.grisSable}; font-family:${FONT_STACK};`;
    const horaireStyle = `${cellStyle} white-space:nowrap;`;
    return `
    <tr>
      <td bgcolor="${bg}" style="${horaireStyle}">${escapeHtml(row.horaire)}</td>
      <td bgcolor="${bg}" style="${cellStyle}">${escapeHtml(row.theme)}</td>
      <td bgcolor="${bg}" style="${cellStyle}">${escapeHtml(row.intervenant)}</td>
    </tr>`;
  }).join('');

  return `
  <tr>
    <td style="padding:30px 40px; font-family:${FONT_STACK};">
      <h2 style="margin:0 0 16px 0; color:${COLORS.bleuNuit}; font-size:20px; font-weight:700; border-left:4px solid ${COLORS.terracotta}; padding-left:12px; font-family:${FONT_STACK};">Programme</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
        ${headerHtml}
        ${rowsHtml}
      </table>
    </td>
  </tr>`;
}

function renderCtaBlock(publicUrl: string): string {
  const url = escapeAttr(publicUrl);
  return `
  <tr>
    <td align="center" style="padding:20px 40px 40px 40px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td bgcolor="${COLORS.terracotta}" style="border-radius:6px;">
            <a href="${url}" target="_blank" style="display:inline-block; padding:14px 32px; color:${COLORS.blanc}; text-decoration:none; font-size:16px; font-weight:600; border-radius:6px; font-family:${FONT_STACK};">S'inscrire à l'événement</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderFooterBlock(metadata: InvitationMetadata): string {
  const footerText = escapeHtml(metadata.footerText || 'IArche — Intelligence Artificielle au service des entreprises');
  return `
  <tr>
    <td bgcolor="${COLORS.bleuNuit}" align="center" style="padding:24px 30px; color:${COLORS.blancCasse}; font-size:12px; line-height:1.6; font-family:${FONT_STACK};">
      <p style="margin:0 0 8px 0; color:${COLORS.blancCasse}; font-family:${FONT_STACK};">${footerText}</p>
      <p style="margin:0; color:${COLORS.blancCasse}; font-family:${FONT_STACK};">
        <a href="https://iarche.fr" style="color:${COLORS.terracotta}; text-decoration:none;">iarche.fr</a>
      </p>
    </td>
  </tr>`;
}

/* ── Fonction principale ── */

export function buildEmailHtml(
  content: InvitationContentJson,
  options: BuildEmailHtmlOptions
): string {
  const metadata = content.metadata || {};
  const sections = Array.isArray(content.sections) ? [...content.sections] : [];
  const programmeRows = content.modules?.programme?.rows || [];

  // Tri des sections par order, en excluant le hero (toujours en premier)
  const sortedSections = sections
    .filter(s => s.id !== 'hero')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Construire blocs ordonnés. Pour les sections d'id 'programme', injecter
  // le bloc programme reconstruit depuis modules.programme.rows.
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

  // Si pas de section 'programme' mais des rows existent, ajouter en fin
  if (!hasProgrammeInSections && programmeRows.length > 0) {
    const block = renderProgrammeBlock(programmeRows);
    if (block) middleBlocks.push(block);
  }

  const heroBlock = renderHeroBlock(metadata);
  const ctaBlock = renderCtaBlock(options.publicUrl);
  const footerBlock = renderFooterBlock(metadata);

  const title = escapeHtml(metadata.eventTitle || 'Invitation IArche');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.grisSable}; font-family:${FONT_STACK};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLORS.grisSable}">
  <tr>
    <td align="center" style="padding:20px 10px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background-color:${COLORS.blanc};">
        ${heroBlock}
        ${middleBlocks.join('\n')}
        ${ctaBlock}
        ${footerBlock}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
