// Base64 encoded PNG assets for react-pdf compatibility
// v4.3: Arcs SVG inline fidèles à la charte graphique v4.0
// IMPORTANT: react-pdf ne supporte PAS les SVG externes, uniquement PNG/JPG ou SVG data URI inline

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

// =====================================================
// ARC DÉCORATIF v4.0 - Conforme à la charte graphique
// Reproduction fidèle de public/logos/iarche-arc.svg
// =====================================================
const createArcSVG = (width: number = 160): string => {
  // Ratio de l'arc original: width/height ≈ 3.27
  const height = Math.round(width / 3.27);
  const strokeWidth = width / 40; // Proportionnel
  
  // Arc courbé avec gradient bleu nuit → terracotta
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${IARCHE_COLORS.bleuNuit}"/>
        <stop offset="100%" stop-color="${IARCHE_COLORS.terracotta}"/>
      </linearGradient>
    </defs>
    <path 
      d="M ${strokeWidth} ${height - strokeWidth} 
         Q ${width / 2} ${strokeWidth} ${width - strokeWidth} ${height - strokeWidth}" 
      stroke="url(#arcGrad)" 
      stroke-width="${strokeWidth}" 
      fill="none" 
      stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Gradient bar legacy (pour compatibilité)
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

// =====================================================
// EXPORT ASSETS - Tous les assets pour PDF
// =====================================================
export const BASE64_ASSETS = {
  // Arc décoratif v4.0 - SVG inline (tailles correspondant à LogoArc web)
  arcSm: createArcSVG(100),   // Équivalent size="sm" web
  arcMd: createArcSVG(160),   // Équivalent size="md" web  
  arcLg: createArcSVG(240),   // Équivalent size="lg" web
  arcXl: createArcSVG(360),   // Équivalent size="xl" web
  
  // Gradient bars - SVG inline (legacy)
  barSm: createGradientBarSVG(48, 2),
  barMd: createGradientBarSVG(80, 4),
  barLg: createGradientBarSVG(96, 4),
  barXl: createGradientBarSVG(128, 6),
  barFull: createGradientBarSVG(400, 4),
  
  // Logo variants - URLs dynamiques vers PNG
  // Note: Ces getters sont appelés au runtime pour obtenir l'URL correcte
  get logoGradient() { return getAssetUrl('/logos/iarche-main.png'); },
  get logoWhite() { return getAssetUrl('/logos/iarche-white.png'); },
  get logoDark() { return getAssetUrl('/logos/iarche-dark.png'); },
  get logoMain() { return getAssetUrl('/logos/iarche-main.png'); },
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
