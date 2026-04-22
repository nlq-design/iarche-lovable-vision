/**
 * Sanitize HTML produit par l'éditeur contentEditable pour le rendre compatible
 * avec les clients email (Gmail, Outlook, Apple Mail).
 *
 * Stratégie : whitelist stricte de tags + conversion `<div>` → `<p>` + inline
 * styles forcés. Utilise DOMParser natif navigateur (zéro dépendance npm).
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
  'UL', 'OL', 'LI', 'A', 'SPAN',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'font-weight',
  'text-decoration',
  'font-style',
]);

import { COLORS as TOKEN_COLORS } from '@/components/admin/medias/shared/tokens';

const COLORS = {
  bleuNuit: TOKEN_COLORS.bleuNuit,
  terracotta: TOKEN_COLORS.terracotta,
};

/** Filtre la valeur d'un attribut style pour ne garder que les propriétés sûres. */
function filterStyle(styleValue: string): string {
  return styleValue
    .split(';')
    .map(decl => decl.trim())
    .filter(Boolean)
    .map(decl => {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) return null;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return null;
      // Bloquer url() et expression() pour éviter toute injection
      if (/url\s*\(|expression\s*\(/i.test(val)) return null;
      return `${prop}:${val}`;
    })
    .filter((d): d is string => d !== null)
    .join('; ');
}

/** Style inline par défaut pour chaque tag whitelisté. */
function defaultStyleForTag(tagName: string): string {
  switch (tagName) {
    case 'P':
      return `margin:0 0 12px 0; color:${COLORS.bleuNuit}; line-height:1.6; font-size:15px;`;
    case 'UL':
    case 'OL':
      return `margin:0 0 16px 20px; padding:0; color:${COLORS.bleuNuit};`;
    case 'LI':
      return 'margin:0 0 6px 0;';
    case 'A':
      return `color:${COLORS.terracotta}; text-decoration:underline;`;
    case 'STRONG':
    case 'B':
      return 'font-weight:700;';
    case 'EM':
    case 'I':
      return 'font-style:italic;';
    case 'U':
      return 'text-decoration:underline;';
    default:
      return '';
  }
}

/** Construit l'attribut style fusionné (défaut + filtré utilisateur). */
function mergedStyle(tagName: string, userStyle: string | null): string {
  const baseStyle = defaultStyleForTag(tagName);
  const filtered = userStyle ? filterStyle(userStyle) : '';
  if (!baseStyle && !filtered) return '';
  return [baseStyle, filtered].filter(Boolean).join(' ');
}

/** Échappe les valeurs d'attribut. */
function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Sérialise un nœud DOM en HTML email-safe en appliquant la whitelist.
 * Les tags hors whitelist sont supprimés mais leurs enfants sont conservés.
 * Les `<div>` sont convertis en `<p>`.
 *
 * `defaultLinkHref` : si fourni, les `<a>` sans href valide reçoivent
 * automatiquement ce lien (utile pour rendre les CTA inline cliquables
 * vers la page publique de l'événement).
 */
function serializeNode(node: Node, defaultLinkHref?: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as Element;
  let tagName = el.tagName.toUpperCase();

  // Convertir <div> → <p>
  if (tagName === 'DIV') {
    tagName = 'P';
  }

  // Sérialiser les enfants
  let inner = '';
  el.childNodes.forEach(child => {
    inner += serializeNode(child, defaultLinkHref);
  });

  // Tag hors whitelist : supprimer le tag, garder le contenu
  if (!ALLOWED_TAGS.has(tagName)) {
    // Supprime totalement script / style / iframe (pas même le contenu)
    if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'IFRAME') {
      return '';
    }
    return inner;
  }

  // <br> est self-closing
  if (tagName === 'BR') {
    return '<br>';
  }

  // Construire le tag d'ouverture avec attributs filtrés
  const attrs: string[] = [];
  const userStyle = el.getAttribute('style');
  const style = mergedStyle(tagName, userStyle);
  if (style) attrs.push(`style="${escapeAttr(style)}"`);

  // <a href> : conserver href, forcer target/rel ; fallback defaultLinkHref si href absent/invalide
  if (tagName === 'A') {
    const rawHref = el.getAttribute('href');
    const validHref =
      rawHref && /^(https?:|mailto:|tel:)/i.test(rawHref) ? rawHref : undefined;
    const finalHref = validHref ?? defaultLinkHref;
    if (finalHref) {
      attrs.push(`href="${escapeAttr(finalHref)}"`);
      attrs.push('target="_blank"');
      attrs.push('rel="noopener"');
    }
  }

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
  return `<${tagName.toLowerCase()}${attrStr}>${inner}</${tagName.toLowerCase()}>`;
}

/**
 * Sanitize un fragment HTML pour usage email-safe.
 * Whitelist : p, br, strong, b, em, i, u, ul, ol, li, a, span.
 */
export function sanitizeSectionHtml(html: string, defaultLinkHref?: string): string {
  if (!html || typeof html !== 'string') return '';

  // DOMParser natif (browser-only — toutes les routes admin sont client-side)
  if (typeof DOMParser === 'undefined') {
    // Fallback strict : strip tous les tags
    return html.replace(/<[^>]+>/g, '');
  }

  const parser = new DOMParser();
  // On wrap dans un container pour avoir un parent unique
  const doc = parser.parseFromString(`<!DOCTYPE html><html><body><div id="__root">${html}</div></body></html>`, 'text/html');
  const root = doc.getElementById('__root');
  if (!root) return '';

  let out = '';
  root.childNodes.forEach(child => {
    out += serializeNode(child, defaultLinkHref);
  });
  return out;
}
