// Base64 encoded PNG assets for react-pdf compatibility
// v4.2: URLs dynamiques selon l'environnement
// IMPORTANT: react-pdf ne supporte PAS les SVG externes, uniquement PNG/JPG

import { IARCHE_COLORS } from './tokens';

// Détection de l'environnement pour les URLs
const getBaseUrl = (): string => {
  // En production, utiliser le domaine officiel
  if (typeof window !== 'undefined' && window.location.hostname === 'iarche.fr') {
    return 'https://iarche.fr';
  }
  // En développement/preview Lovable, utiliser le domaine actuel
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback pour SSR/Node
  return '';
};

// URLs absolues vers les fichiers PNG (obligatoire pour react-pdf)
const getAssetUrl = (path: string): string => {
  const base = getBaseUrl();
  return `${base}${path}`;
};

// Generate gradient bar as SVG data URI (inline - toujours fonctionne)
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

// Créer un arc en SVG data URI (inline - toujours fonctionne)
const createArcSVG = (width: number = 80): string => {
  const height = width * 0.3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
        <stop offset="100%" stop-color="${IARCHE_COLORS.terracotta}"/>
      </linearGradient>
    </defs>
    <path d="M 0 ${height} Q ${width / 2} 0 ${width} ${height}" 
          stroke="url(#arcGrad)" 
          stroke-width="2.5" 
          fill="none" 
          stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Export assets - priorité aux data URI inline pour fiabilité
export const BASE64_ASSETS = {
  // Arc décoratif v4.0 - SVG inline (fonctionne toujours)
  arcSm: createArcSVG(48),
  arcMd: createArcSVG(80),
  arcLg: createArcSVG(120),
  arcXl: createArcSVG(160),
  
  // Gradient bars - SVG inline
  barSm: createGradientBarSVG(48, 2),
  barMd: createGradientBarSVG(80, 4),
  barLg: createGradientBarSVG(96, 4),
  barXl: createGradientBarSVG(128, 6),
  barFull: createGradientBarSVG(400, 4),
  
  // Logo variants - URLs dynamiques vers PNG
  // Ces fonctions doivent être appelées au runtime
  get logoGradient() { return getAssetUrl('/logos/iarche-main.png'); },
  get logoWhite() { return getAssetUrl('/logos/iarche-white.png'); },
  get logoTerracotta() { return getAssetUrl('/logos/iarche-main.png'); },
  get logoMain() { return getAssetUrl('/logos/iarche-main.png'); },
  get logoDark() { return getAssetUrl('/logos/iarche-dark.png'); },
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
