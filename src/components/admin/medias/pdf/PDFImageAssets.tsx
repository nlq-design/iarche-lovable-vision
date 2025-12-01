import { View, Text, Svg, Rect, Line, Defs, LinearGradient, Stop, StyleSheet } from '@react-pdf/renderer';
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
 * IArche logo using Text element for reliable PDF rendering
 * No Image component = no Buffer issues
 */
export const PDFImageLogo = ({ 
  width = 160, 
  variant = 'gradient',
  style 
}: PDFImageLogoProps) => {
  const fontSize = width / 4.5;
  
  // Get color based on variant
  const getColor = () => {
    switch (variant) {
      case 'white': return IARCHE_COLORS.white;
      case 'terracotta': return IARCHE_COLORS.terracotta;
      default: return IARCHE_COLORS.bleuNuit; // Gradient fallback to solid
    }
  };
  
  return (
    <View style={[styles.logoContainer, style]}>
      <Text style={{
        fontSize,
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
        color: getColor(),
      }}>
        IArche
      </Text>
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
 * Decorative gradient bar using View elements for reliable PDF rendering
 * Approximates BleuNuit → Terracotta → BleuNuit gradient with 5 segments
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
  
  return (
    <View style={[styles.barContainer, style]}>
      <View style={{ 
        flexDirection: 'row', 
        width: finalWidth, 
        height: finalHeight, 
        borderRadius: finalHeight / 2, 
        overflow: 'hidden' 
      }}>
        <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.bleuNuit }} />
        <View style={{ flex: 1, backgroundColor: '#2A4A6A' }} />
        <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.terracotta }} />
        <View style={{ flex: 1, backgroundColor: '#2A4A6A' }} />
        <View style={{ flex: 1, backgroundColor: IARCHE_COLORS.bleuNuit }} />
      </View>
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
  /** Is dark theme */
  isDark?: boolean;
}

/**
 * Mesh pattern background using SVG Lines - no Image component
 */
export const PDFPatternBackground = ({
  pageWidth,
  pageHeight,
  opacity = 0.06,
  isDark = true,
}: PDFPatternBackgroundProps) => {
  const strokeColor = isDark ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const spacing = 50;
  const lines = [];
  
  // Generate diagonal lines
  for (let i = -pageHeight; i < pageWidth + pageHeight; i += spacing) {
    lines.push(
      <Line 
        key={`d1-${i}`}
        x1={i} 
        y1={0} 
        x2={i + pageHeight} 
        y2={pageHeight} 
        stroke={strokeColor} 
        strokeWidth={0.5} 
        opacity={opacity}
      />
    );
    lines.push(
      <Line 
        key={`d2-${i}`}
        x1={i + pageHeight} 
        y1={0} 
        x2={i} 
        y2={pageHeight} 
        stroke={strokeColor} 
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

// Export sources (empty for compatibility)
export const PDFLogoSources = {};
export const PDFBarSources = {};
