/**
 * IArche Design System Tokens for HTML/PNG exports
 * Réexporte les tokens partagés + adaptations HTML spécifiques
 */

// Import des tokens partagés
import {
  COLORS,
  GRADIENTS,
  FONTS,
  BAR_SIZES,
  LOGO_SIZES,
  ARCH_SIZES,
  EXPORT_FORMATS,
  LOGO_BAR_MAPPING,
  LOGO_BAR_GAP,
} from '../shared/tokens';

// Réexport pour compatibilité avec le code existant
export const IARCHE_COLORS = {
  bleuNuit: COLORS.bleuNuit,
  terracotta: COLORS.terracotta,
  blancCasse: COLORS.blancCasse,
  bleuNuitLight: COLORS.bleuNuitLight10,
  terracottaLight: COLORS.terracottaLight20,
  white: COLORS.white,
  grey: COLORS.subtle,
  greyLight: COLORS.muted,
  foreground: COLORS.foreground,
  secondary: COLORS.secondary,
  border: COLORS.border,
} as const;

export const IARCHE_GRADIENTS = {
  primary: GRADIENTS.background.css,
  bar: GRADIENTS.bar.css,
  barReverse: GRADIENTS.barReverse.css,
  text: GRADIENTS.text.css,
} as const;

export const IARCHE_FONTS = {
  primary: FONTS.html.primary,
  fallback: FONTS.html.fallback,
} as const;

export const IARCHE_SIZES = {
  bar: BAR_SIZES,
  logo: {
    sm: LOGO_SIZES.sm.fontSize,
    md: LOGO_SIZES.md.fontSize,
    lg: LOGO_SIZES.lg.fontSize,
    xl: LOGO_SIZES.xl.fontSize,
  },
  arch: ARCH_SIZES,
} as const;

// Logo + Barre proportions (Charte 3.1)
export { LOGO_BAR_MAPPING, LOGO_BAR_GAP };

// Types
export type { ThemeType, BarSize, LogoSize, ArchSize } from '../shared/tokens';

// Réexport des formats pour référence
export { EXPORT_FORMATS };
