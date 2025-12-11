/**
 * =====================================================
 * CHARTE GRAPHIQUE PERSONNELLE - NICOLAS LARA
 * Tokens extraits du profil LinkedIn
 * =====================================================
 */

// =====================================================
// COULEURS - Palette "Nicolas Lara"
// =====================================================
export const COLORS_PERSO = {
  // Palette primaire (2 couleurs uniquement)
  terracotta: '#D4633A',           // hsl(15, 65%, 52%) - Primary warm
  bleuProfond: '#213A6B',          // hsl(220, 55%, 28%) - Secondary deep
  blancCasse: '#FAF9F7',           // hsl(40, 23%, 97%) - Background light
  
  // Texte
  white: '#FFFFFF',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
  whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  grisTexte: '#4A5568',            // hsl(220, 15%, 35%) - Text on light bg
  
  // Variantes avec opacité
  terracottaLight20: 'rgba(212, 99, 58, 0.2)',
  bleuProfondLight20: 'rgba(33, 58, 107, 0.2)',
  bleuProfondLight50: 'rgba(33, 58, 107, 0.5)',
} as const;

// =====================================================
// GRADIENTS - Style LinkedIn diagonal (sans mauve)
// =====================================================
export const GRADIENTS_PERSO = {
  // Dégradé diagonal Terracotta → Bleu Profond uniquement
  diagonal: {
    angle: 135,
    stops: [
      { color: COLORS_PERSO.terracotta, position: 0 },
      { color: COLORS_PERSO.bleuProfond, position: 100 },
    ],
    css: `linear-gradient(135deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)`,
  },
  // Dégradé horizontal
  horizontal: {
    angle: 90,
    css: `linear-gradient(90deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)`,
  },
  // Dégradé vertical
  vertical: {
    angle: 180,
    css: `linear-gradient(180deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 100%)`,
  },
  // Texte animé
  text: {
    angle: 270,
    css: `linear-gradient(270deg, ${COLORS_PERSO.terracotta} 0%, ${COLORS_PERSO.bleuProfond} 33%, ${COLORS_PERSO.terracotta} 66%, ${COLORS_PERSO.bleuProfond} 100%)`,
  },
  // Fond sombre uni
  darkSolid: {
    css: COLORS_PERSO.bleuProfond,
  },
  // Fond clair uni
  lightSolid: {
    css: COLORS_PERSO.blancCasse,
  },
} as const;

// =====================================================
// TYPOGRAPHIE
// =====================================================
export const FONTS_PERSO = {
  primary: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// =====================================================
// FORMATS D'EXPORT - Réseaux sociaux
// =====================================================
export const EXPORT_FORMATS_PERSO = {
  // LinkedIn
  postLinkedIn: { width: 1080, height: 1080, label: 'Post LinkedIn', platform: 'linkedin' },
  bannerLinkedIn: { width: 1584, height: 396, label: 'Bannière LinkedIn', platform: 'linkedin' },
  
  // Instagram
  postInstagram: { width: 1080, height: 1080, label: 'Post Instagram', platform: 'instagram' },
  storyInstagram: { width: 1080, height: 1920, label: 'Story Instagram', platform: 'instagram' },
  
  // Carrousel (multi-slides)
  carouselSlide: { width: 1080, height: 1350, label: 'Slide Carrousel', platform: 'multi' },
} as const;

// =====================================================
// WATERMARK IArche - Discret
// =====================================================
export const WATERMARK_CONFIG = {
  opacity: 0.15,
  position: 'bottom-right' as const,
  padding: 20,
  size: {
    sm: 40,
    md: 60,
    lg: 80,
  },
} as const;

// =====================================================
// TYPES
// =====================================================
export type ThemePerso = 'dark' | 'light';
export type GradientTypePerso = keyof typeof GRADIENTS_PERSO;
export type ExportFormatPerso = keyof typeof EXPORT_FORMATS_PERSO;
