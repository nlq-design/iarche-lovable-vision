import { Font } from '@react-pdf/renderer';

// ============================================
// IARCHE BRAND COLORS - Exact hex values
// ============================================
export const IARCHE_COLORS = {
  // Primary palette
  bleuNuit: '#1A2B4A',      // hsl(218, 47%, 20%) - Primary
  bleuNuitLight: '#233554', // Lighter variant
  terracotta: '#D15A3E',    // hsl(12, 60%, 53%) - Accent
  terracottaLight: '#c96442',
  blancCasse: '#FAF9F7',    // hsl(40, 33%, 97%) - Background
  
  // Text colors
  foreground: '#2D2D2D',    // hsl(0, 0%, 18%)
  subtle: '#666666',        // hsl(0, 0%, 40%)
  muted: '#6B7280',         // hsl(220, 9%, 46%)
  white: '#FFFFFF',
  
  // Surface colors
  secondary: '#F5F3EF',     // hsl(40, 24%, 95%)
  border: '#E8E4DD',        // hsl(36, 18%, 89%)
} as const;

// ============================================
// TYPOGRAPHY - Manrope font registration
// ============================================
Font.register({
  family: 'Manrope',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSg.woff2', 
      fontWeight: 400 
    },
    { 
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggqxSg.woff2', 
      fontWeight: 600 
    },
    { 
      src: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggOxSg.woff2', 
      fontWeight: 700 
    },
  ],
});

export const TYPOGRAPHY = {
  h1: { 
    fontFamily: 'Manrope', 
    fontSize: 32, 
    fontWeight: 700 as const,
    color: IARCHE_COLORS.foreground,
  },
  h2: { 
    fontFamily: 'Manrope', 
    fontSize: 24, 
    fontWeight: 700 as const,
    color: IARCHE_COLORS.foreground,
  },
  h3: { 
    fontFamily: 'Manrope', 
    fontSize: 18, 
    fontWeight: 600 as const,
    color: IARCHE_COLORS.foreground,
  },
  body: { 
    fontFamily: 'Manrope', 
    fontSize: 12, 
    fontWeight: 400 as const, 
    lineHeight: 1.6,
    color: IARCHE_COLORS.foreground,
  },
  caption: { 
    fontFamily: 'Manrope', 
    fontSize: 10, 
    fontWeight: 400 as const, 
    color: IARCHE_COLORS.subtle,
  },
  // PDF-specific larger sizes
  pdfTitle: {
    fontFamily: 'Manrope',
    fontSize: 64,
    fontWeight: 700 as const,
    color: IARCHE_COLORS.white,
  },
  pdfSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: 500 as const,
    color: IARCHE_COLORS.white,
    opacity: 0.6,
  },
  pdfBody: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: 400 as const,
    lineHeight: 1.6,
    color: IARCHE_COLORS.white,
    opacity: 0.85,
  },
  pdfHighlight: {
    fontFamily: 'Manrope',
    fontSize: 80,
    fontWeight: 700 as const,
    color: IARCHE_COLORS.terracotta,
  },
} as const;

// ============================================
// DIMENSIONS - Format sizes
// ============================================
export const PDF_FORMATS = {
  carouselLinkedIn: { width: 1080, height: 1350 },
  carouselInstagram: { width: 1080, height: 1080 },
  presentation: { width: 1920, height: 1080 },
  a4: { width: 595, height: 842 },
} as const;

// ============================================
// DECORATIVE BAR SIZES
// ============================================
export const BAR_SIZES = {
  sm: { width: 48, height: 2 },
  md: { width: 80, height: 4 },
  lg: { width: 96, height: 4 },
  xl: { width: 128, height: 6 },
} as const;

// ============================================
// LOGO SIZES
// ============================================
export const LOGO_SIZES = {
  sm: { width: 80, fontSize: 18, viewBox: '0 0 80 24' },
  md: { width: 120, fontSize: 24, viewBox: '0 0 100 30' },
  lg: { width: 160, fontSize: 32, viewBox: '0 0 120 36' },
} as const;
