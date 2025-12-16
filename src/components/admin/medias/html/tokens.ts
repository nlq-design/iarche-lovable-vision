/**
 * IArche Design System Tokens for HTML/PNG exports v4.1
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
  THEMES,
  getThemeColors,
  getBackgroundColor,
  getTextColor,
  getSubtextColor,
  getAccentColor,
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
  // v4.1 - Nouveaux
  terracottaDark: COLORS.terracottaDark,
  contrastDark: COLORS.contrastDark,
  contrastLight: COLORS.contrastLight,
} as const;

export const IARCHE_GRADIENTS = {
  primary: GRADIENTS.background.css,
  bar: GRADIENTS.bar.css,
  barReverse: GRADIENTS.barReverse.css,
  text: GRADIENTS.text.css,
  // v4.1 - Nouveaux
  arc: GRADIENTS.arc.css,
  arcReverse: GRADIENTS.arcReverse.css,
  backgroundTerra: GRADIENTS.backgroundTerra.css,
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

// Export size mapping
export { EXPORT_BAR_MAPPING } from '../shared/tokens';

// Types
export type { ThemeType, BarSize, LogoSize, ArchSize, ExportSize, ArcSize, GradientDirection, ExportFormat } from '../shared/tokens';

// Réexport des formats pour référence
export { EXPORT_FORMATS };

// v4.1 - Helpers pour les thèmes
export { THEMES, getThemeColors, getBackgroundColor, getTextColor, getSubtextColor, getAccentColor };
