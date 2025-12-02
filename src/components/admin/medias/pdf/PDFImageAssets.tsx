import { View, Text, Svg, Rect, Line, Defs, LinearGradient, Stop, G, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { IARCHE_COLORS } from './tokens';

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'flex-start',
  },
  barContainer: {
    alignItems: 'center',
  },
});

// Logo variant types - now based on background theme
type LogoTheme = 'dark' | 'light';

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
  /** Theme: dark (on dark bg) or light (on light bg) */
  theme?: LogoTheme;
  style?: Style;
}

/**
 * IArche logo using SVG Text with LinearGradient for true gradient effect
 * - On dark background: White → Terracotta → White gradient
 * - On light background: Bleu Nuit → Terracotta → Bleu Nuit gradient
 */
export const PDFImageLogo = ({ 
  width = 120, 
  theme = 'light',
  style 
}: PDFImageLogoProps) => {
  const height = 40;
  const fontSize = 28;
  
  // Gradient colors based on background theme
  const gradientColors = theme === 'dark' 
    ? { start: IARCHE_COLORS.white, mid: IARCHE_COLORS.terracotta, end: IARCHE_COLORS.white }
    : { start: IARCHE_COLORS.bleuNuit, mid: IARCHE_COLORS.terracotta, end: IARCHE_COLORS.bleuNuit };
  
  return (
    <View style={[styles.logoContainer, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={gradientColors.start} />
            <Stop offset="50%" stopColor={gradientColors.mid} />
            <Stop offset="100%" stopColor={gradientColors.end} />
          </LinearGradient>
        </Defs>
        <Text
          x="0"
          y="28"
          fill="url(#logoGradient)"
          style={{
            fontSize,
            fontFamily: 'Helvetica-Bold',
            fontWeight: 'bold',
          }}
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
 * Corner arches decoration with gradient strokes - L-shaped lines
 * Matches IArche's visual identity from the website
 * Uses Line elements forming right angles at corners
 */
export const PDFArchesDecoration = ({
  width,
  height,
  isDark = true,
  cornerSize = 120,
}: PDFArchesDecorationProps) => {
  const opacity = isDark ? 0.3 : 0.4;
  
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
        {/* Gradient for top-right arch: Bleu Nuit → Terracotta */}
        <LinearGradient id="archeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
        </LinearGradient>
        {/* Gradient for bottom-left arch: Terracotta → Bleu Nuit */}
        <LinearGradient id="archeGradient2" x1="100%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.terracotta} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
        </LinearGradient>
      </Defs>
      
      {/* Top-right corner - inverted L shape */}
      <G opacity={opacity}>
        {/* Vertical line from top */}
        <Line 
          x1={width} 
          y1={0} 
          x2={width} 
          y2={cornerSize} 
          stroke="url(#archeGradient1)" 
          strokeWidth={3} 
        />
        {/* Horizontal line */}
        <Line 
          x1={width} 
          y1={cornerSize} 
          x2={width - cornerSize} 
          y2={cornerSize} 
          stroke="url(#archeGradient1)" 
          strokeWidth={3} 
        />
      </G>
      
      {/* Bottom-left corner - L shape */}
      <G opacity={opacity}>
        {/* Vertical line from bottom */}
        <Line 
          x1={0} 
          y1={height} 
          x2={0} 
          y2={height - cornerSize} 
          stroke="url(#archeGradient2)" 
          strokeWidth={3} 
        />
        {/* Horizontal line */}
        <Line 
          x1={0} 
          y1={height - cornerSize} 
          x2={cornerSize} 
          y2={height - cornerSize} 
          stroke="url(#archeGradient2)" 
          strokeWidth={3} 
        />
      </G>
    </Svg>
  );
};
