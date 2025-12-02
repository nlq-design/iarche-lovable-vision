import { View, Text, Svg, Rect, Line, Path, Image, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { IARCHE_COLORS } from './tokens';

// Logo PNG paths for different variants - use window.location.origin for absolute URLs
const getLogoUrl = (variant: 'gradient' | 'white' | 'terracotta') => {
  const basePath = typeof window !== 'undefined' ? window.location.origin : '';
  const paths = {
    gradient: '/assets/logo-iarche-gradient.png',
    white: '/assets/logo-iarche-white.png',
    terracotta: '/assets/logo-iarche-terracotta.png',
  };
  return `${basePath}${paths[variant]}`;
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    objectFit: 'contain',
  },
  barContainer: {
    alignItems: 'center',
  },
});

// Logo variants
type LogoVariant = 'gradient' | 'white' | 'terracotta';

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
  /** Logo variant: gradient (default), white, or terracotta */
  variant?: LogoVariant;
  style?: Style;
}

/**
 * IArche logo using PNG images for true gradient rendering
 * Matches the brand's gradient identity (Bleu Nuit ↔ Terracotta)
 */
export const PDFImageLogo = ({ 
  width = 160, 
  variant = 'gradient',
  style 
}: PDFImageLogoProps) => {
  // Maintain aspect ratio (logo is approximately 3.5:1)
  const height = width / 3.5;
  
  return (
    <View style={[styles.logoContainer, style]}>
      <Image
        src={getLogoUrl(variant)}
        style={[styles.logoImage, { width, height }]}
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
 * IArche gradient bar using SVG Rect with LinearGradient
 * True gradient from Bleu Nuit to Terracotta
 */
export const PDFImageBar = ({ 
  size = 'md', 
  width, 
  height, 
  style 
}: PDFImageBarProps) => {
  const defaultSize = PDFBarSizes[size];
  const barWidth = width || defaultSize.width;
  const barHeight = height || defaultSize.height;
  
  // Solid terracotta color (gradient limitation in @react-pdf/renderer)
  return (
    <View style={[styles.barContainer, style]}>
      <Svg width={barWidth} height={barHeight} viewBox={`0 0 ${barWidth} ${barHeight}`}>
        <Rect
          x="0"
          y="0"
          width={barWidth}
          height={barHeight}
          fill={IARCHE_COLORS.terracotta}
          rx={barHeight / 2}
        />
      </Svg>
    </View>
  );
};

/** Shorthand for PDFImageBar with just size */
export const PDFImageBarSized = ({ 
  size = 'md', 
  style 
}: { 
  size?: keyof typeof PDFBarSizes; 
  style?: Style 
}) => {
  return <PDFImageBar size={size} style={style} />;
};

// Legacy exports for compatibility
export const PDFLogoSources = {
  gradient: 'gradient',
  white: 'white',
  terracotta: 'terracotta',
} as const;

export const PDFBarSources = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

interface PDFPatternBackgroundProps {
  /** Page width */
  pageWidth: number;
  /** Page height */
  pageHeight: number;
  /** Pattern opacity (0-1) */
  opacity?: number;
  /** Dark theme (affects line color) */
  isDark?: boolean;
}

/**
 * Mesh pattern background using SVG Line elements
 * Creates subtle diagonal grid pattern
 */
export const PDFPatternBackground = ({ 
  pageWidth, 
  pageHeight, 
  opacity = 0.06,
  isDark = true
}: PDFPatternBackgroundProps) => {
  const lineColor = isDark ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const spacing = 40;
  const lines: React.ReactNode[] = [];
  
  // Generate diagonal lines
  for (let i = -pageHeight; i < pageWidth + pageHeight; i += spacing) {
    lines.push(
      <Line
        key={`line-${i}`}
        x1={i}
        y1={0}
        x2={i + pageHeight}
        y2={pageHeight}
        stroke={lineColor}
        strokeWidth={0.5}
        opacity={opacity}
      />
    );
  }
  
  return (
    <Svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pageWidth,
        height: pageHeight,
      }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
    >
      {lines}
    </Svg>
  );
};

interface PDFArchesDecorationProps {
  /** Page/slide width */
  width: number;
  /** Page/slide height */
  height: number;
  /** Dark theme */
  isDark?: boolean;
  /** Corner size */
  cornerSize?: number;
}

/**
 * Corner arches decoration with gradient strokes
 * Matches IArche's visual identity (L-shaped corners)
 */
export const PDFArchesDecoration = ({
  width,
  height,
  isDark = true,
  cornerSize = 150,
}: PDFArchesDecorationProps) => {
  // High visibility for arches
  const opacity = isDark ? 0.85 : 0.9;
  const secondaryOpacity = isDark ? 0.5 : 0.6;
  
  // Solid colors based on theme
  const primaryColor = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const secondaryColor = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.terracotta;
  
  return (
    <Svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Top-right corner arch - L shape */}
      <Path 
        d={`M${width - cornerSize} 0 L${width} 0 L${width} ${cornerSize}`}
        fill="none" 
        stroke={primaryColor}
        strokeWidth={4} 
        opacity={opacity}
      />
      
      {/* Bottom-left corner arch - inverted L shape */}
      <Path 
        d={`M0 ${height - cornerSize} L0 ${height} L${cornerSize} ${height}`}
        fill="none" 
        stroke={primaryColor}
        strokeWidth={4} 
        opacity={opacity}
      />
      
      {/* Secondary arches (inner, smaller) */}
      <Path 
        d={`M${width - cornerSize + 25} 25 L${width - 25} 25 L${width - 25} ${cornerSize - 25}`}
        fill="none" 
        stroke={secondaryColor}
        strokeWidth={2} 
        opacity={secondaryOpacity}
      />
      <Path 
        d={`M25 ${height - cornerSize + 25} L25 ${height - 25} L${cornerSize - 25} ${height - 25}`}
        fill="none" 
        stroke={secondaryColor}
        strokeWidth={2} 
        opacity={secondaryOpacity}
      />
    </Svg>
  );
};
