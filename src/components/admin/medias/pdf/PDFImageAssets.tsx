import { Image, View, StyleSheet } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';

// Import all PNG assets
import logoGradient from '@/assets/pdf/logo-iarche-gradient.png';
import logoWhite from '@/assets/pdf/logo-iarche-white.png';
import logoTerracotta from '@/assets/pdf/logo-iarche-terracotta.png';
import barSm from '@/assets/pdf/bar-sm.png';
import barMd from '@/assets/pdf/bar-md.png';
import barLg from '@/assets/pdf/bar-lg.png';
import barXl from '@/assets/pdf/bar-xl.png';
import patternMesh from '@/assets/pdf/pattern-mesh.png';

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
  gradient: logoGradient,
  white: logoWhite,
  terracotta: logoTerracotta,
};

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
  /** Logo variant: gradient (default), white, or terracotta */
  variant?: LogoVariant;
  style?: Style;
}

/**
 * IArche logo using pre-rendered PNG with gradient/solid color
 * Reliable rendering across all PDF viewers
 */
export const PDFImageLogo = ({ 
  width = 160, 
  variant = 'gradient',
  style 
}: PDFImageLogoProps) => {
  // Maintain aspect ratio based on actual image dimensions
  const height = width / 2.5;
  
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
  sm: barSm,
  md: barMd,
  lg: barLg,
  xl: barXl,
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
 * Decorative gradient bar using pre-rendered PNG
 * Sizes follow GradientTitle.tsx specifications
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
      <Image
        src={barSources[size]}
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
 * Tileable mesh pattern background using PNG
 */
export const PDFPatternBackground = ({
  pageWidth,
  pageHeight,
  opacity = 1,
}: PDFPatternBackgroundProps) => {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pageWidth,
        height: pageHeight,
        opacity,
      }}
    >
      <Image
        src={patternMesh}
        style={{
          width: pageWidth,
          height: pageHeight,
          objectFit: 'cover',
        }}
      />
    </View>
  );
};

// Export all logo sources for direct use if needed
export const PDFLogoSources = logoSources;
export const PDFBarSources = barSources;
export const PDFPatternSource = patternMesh;
