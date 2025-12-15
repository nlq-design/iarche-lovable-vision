// Base64 encoded PNG assets for react-pdf compatibility
// v4.0: Utilise les logos officiels en PNG

import { IARCHE_COLORS } from './tokens';

// Arc v4.0 - URL directe vers le fichier PNG de référence
const getArcUrl = (): string => {
  // Utilise le fichier PNG exact fourni
  return '/assets/arc-iarche-v4.png';
};

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

// Export pre-generated assets
export const BASE64_ASSETS = {
  // Arc décoratifs (v4.0) - URL directe vers le PNG de référence
  arcSm: getArcUrl(),
  arcMd: getArcUrl(),
  arcLg: getArcUrl(),
  arcXl: getArcUrl(),
  
  // Gradient bars (legacy - kept for compatibility)
  barSm: createGradientBarSVG(48, 2),
  barMd: createGradientBarSVG(80, 4),
  barLg: createGradientBarSVG(96, 4),
  barXl: createGradientBarSVG(128, 6),
  barFull: createGradientBarSVG(400, 4),
  
  // Logo variants v4.0 - URLs vers les fichiers PNG officiels
  logoGradient: '/logos/iarche-main.png',
  logoWhite: '/logos/iarche-white.png',
  logoTerracotta: '/logos/iarche-main.png', // Fallback vers le logo principal
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
