/**
 * =====================================================
 * IARCHE DESIGN SYSTEM v4.1 - TOKENS PARTAGÉS
 * Source unique de vérité pour PDF et PNG
 * =====================================================
 * 
 * CHANGELOG v4.1:
 * - Ajout du thème Terra Nova (fond Terracotta)
 * - Ajout du gradient inversé (Terracotta → Bleu Nuit)
 * - Ajout du mode contraste fort WCAG AAA
 * - Nouveaux formats : YouTube Cover, Reels/TikTok, Carte visite
 */

// =====================================================
// COULEURS - Palette officielle IArche
// =====================================================
export const COLORS = {
  // Palette primaire
  bleuNuit: '#1A2B4A',           // hsl(218, 47%, 20%) - Primary
  bleuNuitDark: '#14203A',       // Version plus sombre pour gradients
  terracotta: '#B04A32',         // hsl(12, 60%, 44%) - Accent (WCAG AA compliant)
  terracottaDark: '#8C3A28',     // Version plus sombre pour gradients
  blancCasse: '#FAF9F7',         // hsl(30, 14%, 98%) - Background clair
  
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
  
  // Contraste fort WCAG AAA
  contrastDark: '#0D1520',       // Fond très sombre
  contrastLight: '#FFFFFF',      // Texte blanc pur
} as const;

// =====================================================
// THÈMES - Configurations complètes par thème
// =====================================================
export const THEMES = {
  dark: {
    background: COLORS.bleuNuit,
    text: COLORS.white,
    subtext: COLORS.whiteAlpha80,
    accent: COLORS.terracotta,
    border: COLORS.whiteAlpha20,
  },
  light: {
    background: COLORS.blancCasse,
    text: COLORS.bleuNuit,
    subtext: COLORS.subtle,
    accent: COLORS.terracotta,
    border: COLORS.border,
  },
  terra: {
    background: COLORS.terracotta,
    text: COLORS.blancCasse,
    subtext: COLORS.whiteAlpha80,
    accent: COLORS.bleuNuit,
    border: COLORS.whiteAlpha20,
  },
  contrast: {
    background: COLORS.contrastDark,
    text: COLORS.contrastLight,
    subtext: COLORS.whiteAlpha80,
    accent: COLORS.terracotta,
    border: COLORS.whiteAlpha40,
  },
} as const;

// =====================================================
// GRADIENTS - Définitions CSS et angles
// =====================================================
export const GRADIENTS = {
  // Arc décoratif (v4.0 : remplace la barre)
  arc: {
    angle: 90,
    stops: [
      { color: COLORS.bleuNuit, position: 0 },
      { color: COLORS.terracotta, position: 100 },
    ],
    css: `linear-gradient(90deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 100%)`,
  },
  // Arc inversé (v4.1)
  arcReverse: {
    angle: 90,
    stops: [
      { color: COLORS.terracotta, position: 0 },
      { color: COLORS.bleuNuit, position: 100 },
    ],
    css: `linear-gradient(90deg, ${COLORS.terracotta} 0%, ${COLORS.bleuNuit} 100%)`,
  },
  // Barre décorative horizontale (legacy - maintenue pour compatibilité)
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
  // Fond Terra Nova (v4.1)
  backgroundTerra: {
    angle: 135,
    stops: [
      { color: COLORS.terracotta, position: 0 },
      { color: COLORS.terracottaDark, position: 100 },
    ],
    css: `linear-gradient(135deg, ${COLORS.terracotta} 0%, ${COLORS.terracottaDark} 100%)`,
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
// DIMENSIONS - Arcs décoratifs (v4.0)
// =====================================================
export const ARC_SIZES = {
  sm: { width: 48, height: 12, strokeWidth: 1.5 },
  md: { width: 80, height: 20, strokeWidth: 2 },
  lg: { width: 120, height: 30, strokeWidth: 2.5 },
  xl: { width: 160, height: 40, strokeWidth: 3 },
} as const;

// =====================================================
// DIMENSIONS - Barres décoratives (legacy - Charte 3.x)
// =====================================================
export const BAR_SIZES = {
  sm: { width: 48, height: 2 },
  md: { width: 80, height: 4 },
  lg: { width: 96, height: 4 },
  xl: { width: 128, height: 6 },
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
// LOGO + ARC - Proportions obligatoires (Charte 4.0)
// Le logo IArche utilise maintenant un arc au-dessus du texte
// =====================================================
export const LOGO_ARC_MAPPING: Record<LogoSize, ArcSize> = {
  sm: 'sm',  // Logo sm → Arc sm
  md: 'md',  // Logo md → Arc md
  lg: 'lg',  // Logo lg → Arc lg
  xl: 'xl',  // Logo xl → Arc xl
} as const;

// Legacy: LOGO + BARRE (Charte 3.x - maintenu pour compatibilité)
export const LOGO_BAR_MAPPING: Record<LogoSize, BarSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

// Mapping export size → arc size (pour LogoEditor v4.0)
export const EXPORT_ARC_MAPPING = {
  '100': 'sm',
  '250': 'md',
  '500': 'xl',
} as const;

// Legacy mapping (Charte 3.x)
export const EXPORT_BAR_MAPPING = {
  '100': 'sm',
  '250': 'md',
  '500': 'xl',
} as const;

// Espacement logo-arc proportionnel
export const LOGO_ARC_GAP: Record<LogoSize, number> = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
} as const;

// Legacy: Espacement logo-barre (Charte 3.x)
export const LOGO_BAR_GAP: Record<LogoSize, number> = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
} as const;

// =====================================================
// FORMATS D'EXPORT (v4.1 - étendu)
// =====================================================
export const EXPORT_FORMATS = {
  // PDF formats
  carouselLinkedIn: { width: 1080, height: 1350 },
  carouselInstagram: { width: 1080, height: 1080 },
  presentation: { width: 1920, height: 1080 },
  a4: { width: 595, height: 842 },
  
  // PNG formats - LinkedIn
  bannerLinkedIn: { width: 1584, height: 396 },
  postLinkedInSquare: { width: 1200, height: 1200 },
  postLinkedInLandscape: { width: 1200, height: 627 },
  
  // PNG formats - Instagram/Stories
  story: { width: 1080, height: 1920 },
  instagramSquare: { width: 1080, height: 1080 },
  
  // PNG formats - YouTube (v4.1)
  youtubeCover: { width: 2560, height: 1440 },
  youtubeThumbnail: { width: 1280, height: 720 },
  
  // PNG formats - TikTok/Reels (v4.1)
  reelsTiktok: { width: 1080, height: 1920 },
  
  // PNG formats - Autres
  thumbnail1080: { width: 1920, height: 1080 },
  thumbnail720: { width: 1280, height: 720 },
  openGraph: { width: 1200, height: 630 },
  signature: { width: 600, height: 200 },
  headerEmail: { width: 600, height: 150 },
  
  // PNG formats - Business (v4.1)
  businessCard: { width: 1050, height: 600 },
  
  // Twitter/X
  twitterBanner: { width: 1500, height: 500 },
  twitterPost: { width: 1600, height: 900 },
  
  // Facebook
  facebookBanner: { width: 820, height: 312 },
  facebookPost: { width: 1200, height: 630 },
} as const;

// =====================================================
// TYPES
// =====================================================
export type ThemeType = 'dark' | 'light' | 'terra' | 'contrast';
export type GradientDirection = 'standard' | 'reverse';
export type ArcSize = keyof typeof ARC_SIZES;   // sm | md | lg | xl (v4.0)
export type BarSize = keyof typeof BAR_SIZES;   // sm | md | lg | xl (legacy)
export type LogoSize = keyof typeof LOGO_SIZES;
export type ArchSize = keyof typeof ARCH_SIZES;
export type ExportSize = keyof typeof EXPORT_BAR_MAPPING;
export type ExportFormat = keyof typeof EXPORT_FORMATS;

// =====================================================
// HELPERS - Utilitaires pour les thèmes
// =====================================================
export const getThemeColors = (theme: ThemeType) => THEMES[theme];

export const getBackgroundColor = (theme: ThemeType): string => {
  switch (theme) {
    case 'terra': return COLORS.terracotta;
    case 'contrast': return COLORS.contrastDark;
    case 'light': return COLORS.blancCasse;
    default: return COLORS.bleuNuit;
  }
};

export const getTextColor = (theme: ThemeType): string => {
  switch (theme) {
    case 'light': return COLORS.bleuNuit;
    default: return COLORS.white;
  }
};

export const getSubtextColor = (theme: ThemeType): string => {
  switch (theme) {
    case 'light': return COLORS.subtle;
    default: return COLORS.whiteAlpha80;
  }
};

export const getAccentColor = (theme: ThemeType): string => {
  switch (theme) {
    case 'terra': return COLORS.bleuNuit;
    default: return COLORS.terracotta;
  }
};
