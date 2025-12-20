// Base64 encoded PNG assets for react-pdf compatibility
// v4.1: Utilise les fichiers PNG avec URLs absolues pour react-pdf
// IMPORTANT: react-pdf ne supporte PAS les SVG externes, uniquement PNG/JPG

import { IARCHE_COLORS } from './tokens';

// Domaine de production pour les URLs absolues
const DOMAIN = 'https://iarche.fr';

// URLs absolues vers les fichiers PNG (obligatoire pour react-pdf)
const getAssetUrl = (path: string): string => `${DOMAIN}${path}`;

// Generate gradient bar as SVG data URI (fallback inline)
const createGradientBarSVG = (width: number, height: number): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
        <stop offset="50%" stop-color="${IARCHE_COLORS.terracotta}"/>
        <stop offset="100%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" rx="${height/2}" fill="url(#barGrad)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Export assets avec URLs absolues PNG
export const BASE64_ASSETS = {
  // Arc décoratif v4.0 - PNG pour react-pdf
  arcSm: getAssetUrl('/assets/arc-reference-v4.png'),
  arcMd: getAssetUrl('/assets/arc-reference-v4.png'),
  arcLg: getAssetUrl('/assets/arc-reference-v4.png'),
  arcXl: getAssetUrl('/assets/arc-reference-v4.png'),
  
  // Gradient bars - PNG pour react-pdf
  barSm: getAssetUrl('/assets/bar-sm.png'),
  barMd: getAssetUrl('/assets/bar-md.png'),
  barLg: getAssetUrl('/assets/bar-lg.png'),
  barXl: getAssetUrl('/assets/bar-xl.png'),
  barFull: createGradientBarSVG(400, 4), // Fallback inline pour barres longues
  
  // Logo variants v4.0 - PNG pour react-pdf (URLs absolues obligatoires)
  logoGradient: getAssetUrl('/assets/logo-iarche-gradient.png'),
  logoWhite: getAssetUrl('/assets/logo-iarche-white.png'),
  logoTerracotta: getAssetUrl('/assets/logo-iarche-terracotta.png'),
  
  // Alternatives dans /logos/
  logoMain: getAssetUrl('/logos/iarche-main.png'),
  logoWhiteAlt: getAssetUrl('/logos/iarche-white.png'),
  logoDark: getAssetUrl('/logos/iarche-dark.png'),
};

// Bullet styles as React Native compatible objects
export const BULLET_STYLES = {
  dash: {
    content: '—',
    color: IARCHE_COLORS.terracotta,
    marginRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: IARCHE_COLORS.terracotta,
    marginRight: 12,
    marginTop: 8,
  },
};
