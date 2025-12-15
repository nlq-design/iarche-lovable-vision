// Base64 encoded PNG assets for react-pdf compatibility
// These are inline to guarantee inclusion in PDF documents

import { IARCHE_COLORS } from './tokens';

// Generate gradient bar as SVG data URI (legacy - kept for compatibility)
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

// Arc v4.0 - URL directe vers le fichier PNG de référence
const getArcUrl = (width: number, height: number): string => {
  // Utilise le fichier PNG exact fourni
  return '/assets/arc-iarche-v4.png';
};

// Generate logo as SVG data URI
const createLogoSVG = (variant: 'gradient' | 'white' | 'terracotta'): string => {
  let fill = '';
  let gradientDef = '';
  
  if (variant === 'gradient') {
    gradientDef = `<defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
        <stop offset="50%" stop-color="${IARCHE_COLORS.terracotta}"/>
        <stop offset="100%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
      </linearGradient>
    </defs>`;
    fill = 'url(#logoGrad)';
  } else if (variant === 'white') {
    fill = '#FFFFFF';
  } else {
    fill = IARCHE_COLORS.terracotta;
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="40" viewBox="0 0 140 40">
    ${gradientDef}
    <text x="70" y="30" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="bold" fill="${fill}">IArche</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Export pre-generated assets
export const BASE64_ASSETS = {
  // Arc décoratifs (v4.0) - URL directe vers le PNG de référence
  arcSm: getArcUrl(80, 10),
  arcMd: getArcUrl(120, 14),
  arcLg: getArcUrl(180, 20),
  arcXl: getArcUrl(260, 28),
  
  // Gradient bars (legacy - kept for compatibility)
  barSm: createGradientBarSVG(48, 2),
  barMd: createGradientBarSVG(80, 4),
  barLg: createGradientBarSVG(96, 4),
  barXl: createGradientBarSVG(128, 6),
  barFull: createGradientBarSVG(400, 4),
  
  // Logo variants
  logoGradient: createLogoSVG('gradient'),
  logoWhite: createLogoSVG('white'),
  logoTerracotta: createLogoSVG('terracotta'),
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
