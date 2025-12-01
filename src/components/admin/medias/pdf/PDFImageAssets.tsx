import { Image, View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { BASE64_ASSETS } from './base64Assets';

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  barContainer: {
    alignItems: 'center',
  },
});

// Logo variants
type LogoVariant = 'gradient' | 'white' | 'terracotta';

const logoSources: Record<LogoVariant, string> = {
  gradient: BASE64_ASSETS.logoGradient,
  white: BASE64_ASSETS.logoWhite,
  terracotta: BASE64_ASSETS.logoTerracotta,
};

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
  /** Logo variant: gradient (default), white, or terracotta */
  variant?: LogoVariant;
  style?: Style;
}

/**
 * IArche logo using base64 SVG for reliable PDF rendering
 */
export const PDFImageLogo = ({ 
  width = 160, 
  variant = 'gradient',
  style 
}: PDFImageLogoProps) => {
  const height = width / 3.5; // Aspect ratio for text logo
  
  return (
    <View style={[styles.logoContainer, style]}>
      <Image
        src={logoSources[variant]}
        style={{
          width,
          height,
          objectFit: 'contain',
        }}
      />
    </View>
  );
};

// Bar size configuration matching design system
export const PDFBarSizes = {
  sm: { width: 48, height: 2 },
  md: { width: 80, height: 4 },
  lg: { width: 96, height: 4 },
  xl: { width: 128, height: 6 },
} as const;

const barSources: Record<keyof typeof PDFBarSizes, string> = {
  sm: BASE64_ASSETS.barSm,
  md: BASE64_ASSETS.barMd,
  lg: BASE64_ASSETS.barLg,
  xl: BASE64_ASSETS.barXl,
};

interface PDFImageBarProps {
  /** Bar size: sm, md, lg, xl */
  size?: keyof typeof PDFBarSizes;
  /** Custom width override */
  width?: number;
  /** Custom height override */
  height?: number;
  style?: Style;
}

/**
 * Decorative gradient bar using base64 SVG for reliable PDF rendering
 */
export const PDFImageBar = ({ 
  size = 'md',
  width,
  height,
  style
}: PDFImageBarProps) => {
  const defaultSize = PDFBarSizes[size];
  const finalWidth = width ?? defaultSize.width;
  const finalHeight = height ?? defaultSize.height;
  
  // Use full-width bar for custom large widths
  const src = width && width > 128 ? BASE64_ASSETS.barFull : barSources[size];
  
  return (
    <View style={[styles.barContainer, style]}>
      <Image
        src={src}
        style={{
          width: finalWidth,
          height: finalHeight,
          objectFit: 'cover',
        }}
      />
    </View>
  );
};

// Shorthand component for sized bars
export const PDFImageBarSized = ({ 
  size = 'md',
  style
}: { size?: keyof typeof PDFBarSizes; style?: Style }) => {
  return <PDFImageBar size={size} style={style} />;
};

interface PDFPatternBackgroundProps {
  /** Page width */
  pageWidth: number;
  /** Page height */
  pageHeight: number;
  /** Opacity of the pattern */
  opacity?: number;
}

/**
 * Mesh pattern background - rendered as subtle diagonal lines via SVG
 */
export const PDFPatternBackground = ({
  pageWidth,
  pageHeight,
  opacity = 0.06,
}: PDFPatternBackgroundProps) => {
  // Create a simple mesh pattern as base64 SVG
  const spacing = 50;
  const lines: string[] = [];
  
  // Generate diagonal lines
  for (let i = -pageHeight; i < pageWidth + pageHeight; i += spacing) {
    lines.push(`<line x1="${i}" y1="0" x2="${i + pageHeight}" y2="${pageHeight}" stroke="#888" stroke-width="0.5" opacity="${opacity}"/>`);
    lines.push(`<line x1="${i + pageHeight}" y1="0" x2="${i}" y2="${pageHeight}" stroke="#888" stroke-width="0.5" opacity="${opacity}"/>`);
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidth}" height="${pageHeight}" viewBox="0 0 ${pageWidth} ${pageHeight}">${lines.join('')}</svg>`;
  const dataUri = `data:image/svg+xml;base64,${btoa(svg)}`;
  
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pageWidth,
        height: pageHeight,
      }}
    >
      <Image
        src={dataUri}
        style={{
          width: pageWidth,
          height: pageHeight,
        }}
      />
    </View>
  );
};

// Export sources for direct use
export const PDFLogoSources = logoSources;
export const PDFBarSources = barSources;
