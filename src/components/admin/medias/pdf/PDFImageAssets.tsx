import { View, Text, Svg, Rect, Line, Path, Defs, LinearGradient, Stop, G, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { IARCHE_COLORS } from './tokens';

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

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
  /** Logo variant: gradient (default), white, or terracotta */
  variant?: LogoVariant;
  style?: Style;
}

/**
 * IArche logo using SVG Text with LinearGradient for true gradient effect
 * Matches the brand's gradient identity (Bleu Nuit ↔ Terracotta)
 */
export const PDFImageLogo = ({ 
  width = 160, 
  variant = 'gradient',
  style 
}: PDFImageLogoProps) => {
  const height = width / 3.5;
  const fontSize = width / 4.2;
  
  // For non-gradient variants, use simple text
  if (variant !== 'gradient') {
    const color = variant === 'white' ? IARCHE_COLORS.white : IARCHE_COLORS.terracotta;
    return (
      <View style={[styles.logoContainer, style]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Text
            x={width / 2}
            y={height * 0.72}
            textAnchor="middle"
            style={{
              fontSize,
              fontFamily: 'Helvetica-Bold',
              fontWeight: 'bold',
            }}
            fill={color}
          >
            IArche
          </Text>
        </Svg>
      </View>
    );
  }
  
  // Gradient variant with true SVG LinearGradient
  return (
    <View style={[styles.logoContainer, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* IArche brand gradient: Bleu Nuit → Terracotta → Bleu Nuit */}
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
            <Stop offset="35%" stopColor={IARCHE_COLORS.terracotta} />
            <Stop offset="65%" stopColor={IARCHE_COLORS.terracotta} />
            <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
          </LinearGradient>
        </Defs>
        <Text
          x={width / 2}
          y={height * 0.72}
          textAnchor="middle"
          style={{
            fontSize,
            fontFamily: 'Helvetica-Bold',
            fontWeight: 'bold',
          }}
          fill="url(#logoGradient)"
        >
          IArche
        </Text>
      </Svg>
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
  
  // Unique ID for each bar's gradient to avoid conflicts
  const gradientId = `barGradient-${size}-${barWidth}-${barHeight}`;
  
  return (
    <View style={[styles.barContainer, style]}>
      <Svg width={barWidth} height={barHeight} viewBox={`0 0 ${barWidth} ${barHeight}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
            <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
            <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuitLight} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={barWidth}
          height={barHeight}
          fill={`url(#${gradientId})`}
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
  cornerSize = 120,
}: PDFArchesDecorationProps) => {
  const opacity = isDark ? 0.35 : 0.5;
  const secondaryOpacity = opacity * 0.5;
  
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
      <Defs>
        {/* Gradient for top-right arch */}
        <LinearGradient id="archGradientTR" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
        </LinearGradient>
        {/* Gradient for bottom-left arch */}
        <LinearGradient id="archGradientBL" x1="100%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.terracotta} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
        </LinearGradient>
      </Defs>
      
      {/* Top-right corner arch - L shape */}
      <Path 
        d={`M${width - cornerSize} 0 L${width} 0 L${width} ${cornerSize}`}
        fill="none" 
        stroke="url(#archGradientTR)"
        strokeWidth={3} 
        opacity={opacity}
      />
      
      {/* Bottom-left corner arch - inverted L shape */}
      <Path 
        d={`M0 ${height - cornerSize} L0 ${height} L${cornerSize} ${height}`}
        fill="none" 
        stroke="url(#archGradientBL)"
        strokeWidth={3} 
        opacity={opacity}
      />
      
      {/* Secondary arches (inner, smaller) */}
      <Path 
        d={`M${width - cornerSize + 20} 20 L${width - 20} 20 L${width - 20} ${cornerSize - 20}`}
        fill="none" 
        stroke="url(#archGradientTR)"
        strokeWidth={1.5} 
        opacity={secondaryOpacity}
      />
      <Path 
        d={`M20 ${height - cornerSize + 20} L20 ${height - 20} L${cornerSize - 20} ${height - 20}`}
        fill="none" 
        stroke="url(#archGradientBL)"
        strokeWidth={1.5} 
        opacity={secondaryOpacity}
      />
    </Svg>
  );
};
