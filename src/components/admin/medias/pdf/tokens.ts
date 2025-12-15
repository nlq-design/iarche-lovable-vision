/**
 * IArche Design System Tokens for PDF exports
 * Réexporte les tokens partagés + adaptations PDF spécifiques
 */

// Import des tokens partagés
import {
  COLORS,
  GRADIENTS,
  FONTS,
  BAR_SIZES,
  LOGO_SIZES,
  EXPORT_FORMATS,
  LOGO_BAR_MAPPING,
  LOGO_BAR_GAP,
} from '../shared/tokens';

// Réexport pour compatibilité avec le code existant
export const IARCHE_COLORS = {
  // Primary palette
  bleuNuit: COLORS.bleuNuit,
  bleuNuitLight: '#233554', // Version hex pour PDF (pas de rgba)
  terracotta: COLORS.terracotta,
  terracottaLight: '#a4563c',     // Version plus claire pour PDF (WCAG compliant)
  blancCasse: COLORS.blancCasse,
  
  // Text colors
  foreground: COLORS.foreground,
  subtle: COLORS.subtle,
  muted: COLORS.muted,
  white: COLORS.white,
  
  // Surface colors
  secondary: COLORS.secondary,
  border: COLORS.border,
} as const;

// Typography - PDF utilise Helvetica (limitation @react-pdf)
export const TYPOGRAPHY = {
  h1: { 
    fontFamily: FONTS.pdf.primary, 
    fontSize: 32, 
    fontWeight: 700 as const,
    color: IARCHE_COLORS.foreground,
  },
  h2: { 
    fontFamily: FONTS.pdf.primary, 
    fontSize: 24, 
    fontWeight: 700 as const,
    color: IARCHE_COLORS.foreground,
  },
  h3: { 
    fontFamily: FONTS.pdf.primary, 
    fontSize: 18, 
    fontWeight: 600 as const,
    color: IARCHE_COLORS.foreground,
  },
  body: { 
    fontFamily: FONTS.pdf.secondary, 
    fontSize: 12, 
    fontWeight: 400 as const, 
    lineHeight: 1.6,
    color: IARCHE_COLORS.foreground,
  },
  caption: { 
    fontFamily: FONTS.pdf.secondary, 
    fontSize: 10, 
    fontWeight: 400 as const, 
    color: IARCHE_COLORS.subtle,
  },
  // PDF-specific larger sizes for carousel/presentation
  pdfTitle: {
    fontFamily: FONTS.pdf.primary,
    fontSize: 64,
    fontWeight: 700 as const,
    color: IARCHE_COLORS.white,
  },
  pdfSubtitle: {
    fontFamily: FONTS.pdf.secondary,
    fontSize: 22,
    fontWeight: 500 as const,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
  },
  pdfBody: {
    fontFamily: FONTS.pdf.secondary,
    fontSize: 28,
    fontWeight: 400 as const,
    lineHeight: 1.6,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
  },
  pdfHighlight: {
    fontFamily: FONTS.pdf.primary,
    fontSize: 80,
    fontWeight: 700 as const,
    color: IARCHE_COLORS.terracotta,
  },
} as const;

// Dimensions - réexport direct des tokens partagés
export const PDF_FORMATS = {
  carouselLinkedIn: EXPORT_FORMATS.carouselLinkedIn,
  carouselInstagram: EXPORT_FORMATS.carouselInstagram,
  presentation: EXPORT_FORMATS.presentation,
  a4: EXPORT_FORMATS.a4,
} as const;

// Barres décoratives - dimensions identiques PDF/PNG
export { BAR_SIZES };

// Logo sizes - réexport pour compatibilité
export { LOGO_SIZES } from '../shared/tokens';

// Logo sizes avec infos supplémentaires pour SVG PDF
export const LOGO_SIZES_PDF = {
  sm: { width: LOGO_SIZES.sm.width, fontSize: LOGO_SIZES.sm.fontSize, viewBox: '0 0 80 24' },
  md: { width: LOGO_SIZES.md.width, fontSize: LOGO_SIZES.md.fontSize, viewBox: '0 0 110 32' },
  lg: { width: LOGO_SIZES.lg.width, fontSize: LOGO_SIZES.lg.fontSize, viewBox: '0 0 160 48' },
  xl: { width: LOGO_SIZES.xl.width, fontSize: LOGO_SIZES.xl.fontSize, viewBox: '0 0 210 64' },
} as const;

// Gradients - pour référence (PDF utilise images ou SVG)
export const GRADIENT_STOPS = {
  bar: GRADIENTS.bar.stops,
  barReverse: GRADIENTS.barReverse.stops,
  background: GRADIENTS.background.stops,
} as const;

// Logo + Barre proportions (Charte 3.1)
export { LOGO_BAR_MAPPING, LOGO_BAR_GAP };

// Export size mapping
export { EXPORT_BAR_MAPPING } from '../shared/tokens';

// Types
export type BarSize = keyof typeof BAR_SIZES;
export type LogoSize = keyof typeof LOGO_SIZES;
export type { ArcSize } from '../shared/tokens';
