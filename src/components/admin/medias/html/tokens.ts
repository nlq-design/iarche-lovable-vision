/**
 * IArche Design System Tokens for HTML/PNG exports
 * Source unique de vérité - NE PAS DUPLIQUER
 */

export const IARCHE_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#D15A3E',
  blancCasse: '#FAF9F7',
  bleuNuitLight: 'rgba(26, 43, 74, 0.1)',
  terracottaLight: 'rgba(209, 90, 62, 0.2)',
  white: '#FFFFFF',
  grey: '#666666',
  greyLight: '#888888',
} as const;

export const IARCHE_GRADIENTS = {
  primary: 'linear-gradient(135deg, #1A2B4A 0%, #D15A3E 50%, #1A2B4A 100%)',
  bar: 'linear-gradient(90deg, #1A2B4A 0%, #D15A3E 100%)',
  barReverse: 'linear-gradient(90deg, #D15A3E 0%, #1A2B4A 100%)',
  text: 'linear-gradient(270deg, #1A2B4A 0%, #D15A3E 33%, #1A2B4A 66%, #D15A3E 100%)',
} as const;

export const IARCHE_FONTS = {
  primary: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
  fallback: "Arial, 'Helvetica Neue', sans-serif",
} as const;

export const IARCHE_SIZES = {
  bar: {
    sm: { width: 48, height: 2 },
    md: { width: 80, height: 4 },
    lg: { width: 96, height: 4 },
    xl: { width: 128, height: 6 },
  },
  logo: {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  },
} as const;

export type ThemeType = 'dark' | 'light';
export type BarSize = keyof typeof IARCHE_SIZES.bar;
export type LogoSize = keyof typeof IARCHE_SIZES.logo;
