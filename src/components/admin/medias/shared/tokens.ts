/**
 * =====================================================
 * IARCHE DESIGN SYSTEM - TOKENS PARTAGÉS
 * Source unique de vérité pour PDF et PNG
 * =====================================================
 */

// =====================================================
// COULEURS - Palette officielle IArche
// =====================================================
export const COLORS = {
  // Palette primaire
  bleuNuit: '#1A2B4A',           // hsl(218, 47%, 20%) - Primary
  bleuNuitDark: '#14203A',       // Version plus sombre pour gradients
  terracotta: '#B04A32',         // hsl(12, 60%, 44%) - Accent (WCAG AA compliant)
  blancCasse: '#FAF9F7',         // hsl(40, 33%, 97%) - Background clair
  
  // Variantes avec opacité (pour overlays, shadows)
  bleuNuitLight10: 'rgba(26, 43, 74, 0.1)',
  bleuNuitLight20: 'rgba(26, 43, 74, 0.2)',
  terracottaLight20: 'rgba(176, 74, 50, 0.2)',
  terracottaLight30: 'rgba(176, 74, 50, 0.3)',
  
  // Texte
  foreground: '#2D2D2D',         // hsl(0, 0%, 18%)
  subtle: '#666666',             // hsl(0, 0%, 40%)
  muted: '#6B7280',              // hsl(220, 9%, 46%)
  white: '#FFFFFF',
  whiteAlpha60: 'rgba(255, 255, 255, 0.6)',
  whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  
  // Surfaces
  secondary: '#F5F3EF',          // hsl(40, 24%, 95%)
  border: '#E8E4DD',             // hsl(36, 18%, 89%)
} as const;

// =====================================================
// GRADIENTS - Définitions CSS et angles
// =====================================================
export const GRADIENTS = {
  // Barre décorative horizontale (Charte 3.1 : Bleu → Terracotta → Bleu)
  bar: {
    angle: 90,
    stops: [
      { color: COLORS.bleuNuit, position: 0 },
      { color: COLORS.terracotta, position: 50 },
      { color: COLORS.bleuNuit, position: 100 },
    ],
    css: `linear-gradient(90deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 50%, ${COLORS.bleuNuit} 100%)`,
  },
  barReverse: {
    angle: 90,
    stops: [
      { color: COLORS.terracotta, position: 0 },
      { color: COLORS.bleuNuit, position: 50 },
      { color: COLORS.terracotta, position: 100 },
    ],
    css: `linear-gradient(90deg, ${COLORS.terracotta} 0%, ${COLORS.bleuNuit} 50%, ${COLORS.terracotta} 100%)`,
  },
  // Fond diagonal
  background: {
    angle: 135,
    stops: [
      { color: COLORS.bleuNuit, position: 0 },
      { color: COLORS.bleuNuitDark, position: 100 },
    ],
    css: `linear-gradient(135deg, ${COLORS.bleuNuit} 0%, ${COLORS.bleuNuitDark} 100%)`,
  },
  // Texte animé (logo)
  text: {
    angle: 270,
    stops: [
      { color: COLORS.bleuNuit, position: 0 },
      { color: COLORS.terracotta, position: 33 },
      { color: COLORS.bleuNuit, position: 66 },
      { color: COLORS.terracotta, position: 100 },
    ],
    css: `linear-gradient(270deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 33%, ${COLORS.bleuNuit} 66%, ${COLORS.terracotta} 100%)`,
  },
} as const;

// =====================================================
// TYPOGRAPHIE - Fonts et tailles
// =====================================================
export const FONTS = {
  // Pour HTML/PNG (Manrope disponible via CSS)
  html: {
    primary: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
    fallback: "Arial, 'Helvetica Neue', sans-serif",
  },
  // Pour PDF (@react-pdf ne supporte que les fonts système)
  pdf: {
    primary: 'Helvetica-Bold',
    secondary: 'Helvetica',
  },
} as const;

// =====================================================
// DIMENSIONS - Barres décoratives (Charte 3.1 exacte)
// =====================================================
export const BAR_SIZES = {
  sm: { width: 48, height: 2 },   // Placeholder cards, petits formats
  md: { width: 80, height: 4 },   // Header, formats moyens
  lg: { width: 96, height: 4 },   // Formats intermédiaires
  xl: { width: 128, height: 6 },  // Hero, grands formats
} as const;

// =====================================================
// DIMENSIONS - Logo (font-size en px, width estimée)
// Ajustées pour mieux remplir les exports (100/250/500px)
// =====================================================
export const LOGO_SIZES = {
  sm: { fontSize: 28, width: 95 },    // Pour export ~100px
  md: { fontSize: 42, width: 140 },   // Pour export ~250px
  lg: { fontSize: 56, width: 185 },   // Intermédiaire
  xl: { fontSize: 72, width: 240 },   // Pour export ~500px
} as const;

// =====================================================
// DIMENSIONS - Arches décoratives
// =====================================================
export const ARCH_SIZES = {
  sm: 40,
  md: 60,
  lg: 80,
  xl: 100,
} as const;

// =====================================================
// LOGO + BARRE - Proportions obligatoires (Charte 3.1)
// Le logo IArche DOIT toujours être accompagné de sa barre
// =====================================================
export const LOGO_BAR_MAPPING: Record<LogoSize, BarSize> = {
  sm: 'sm',  // Logo sm (24px) → Barre sm (48×2)
  md: 'md',  // Logo md (32px) → Barre md (80×4)
  lg: 'lg',  // Logo lg (48px) → Barre lg (96×4)
  xl: 'xl',  // Logo xl (64px) → Barre xl (128×6)
} as const;

// Mapping export size → bar size (pour LogoEditor)
// Ratio barre/export : ~25-30% de la largeur d'export
export const EXPORT_BAR_MAPPING = {
  '100': 'sm',   // 100px export → barre 48px (48%)
  '250': 'md',   // 250px export → barre 80px (32%)
  '500': 'xl',   // 500px export → barre 128px (25.6%)
} as const;

// Espacement logo-barre proportionnel (ajusté pour meilleur équilibre)
export const LOGO_BAR_GAP: Record<LogoSize, number> = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
} as const;

// =====================================================
// FORMATS D'EXPORT
// =====================================================
export const EXPORT_FORMATS = {
  // PDF formats
  carouselLinkedIn: { width: 1080, height: 1350 },
  carouselInstagram: { width: 1080, height: 1080 },
  presentation: { width: 1920, height: 1080 },
  a4: { width: 595, height: 842 },
  
  // PNG formats
  bannerLinkedIn: { width: 1584, height: 396 },
  postLinkedInSquare: { width: 1200, height: 1200 },
  postLinkedInLandscape: { width: 1200, height: 627 },
  story: { width: 1080, height: 1920 },
  thumbnail1080: { width: 1920, height: 1080 },
  thumbnail720: { width: 1280, height: 720 },
  openGraph: { width: 1200, height: 630 },
  signature: { width: 600, height: 200 },
  headerEmail: { width: 600, height: 150 },
} as const;

// =====================================================
// TYPES
// =====================================================
export type ThemeType = 'dark' | 'light';
export type BarSize = keyof typeof BAR_SIZES;  // sm | md | lg | xl
export type LogoSize = keyof typeof LOGO_SIZES;
export type ArchSize = keyof typeof ARCH_SIZES;
export type ExportSize = keyof typeof EXPORT_BAR_MAPPING;
