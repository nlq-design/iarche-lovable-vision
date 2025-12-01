import { Image, View, StyleSheet, Styles } from '@react-pdf/renderer';

// Import PNG assets
import logoGradient from '@/assets/pdf/logo-iarche-gradient.png';
import barGradient from '@/assets/pdf/bar-decorative-gradient.png';

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  barContainer: {
    alignItems: 'center',
  },
});

interface PDFImageLogoProps {
  /** Logo width in pixels */
  width?: number;
}

/**
 * IArche logo using pre-rendered PNG with gradient
 * Reliable rendering across all PDF viewers
 */
export const PDFImageLogo = ({ width = 160 }: PDFImageLogoProps) => {
  // Maintain aspect ratio (1024x512 = 2:1)
  const height = width / 2;
  
  return (
    <View style={styles.logoContainer}>
      <Image
        src={logoGradient}
        style={{
          width,
          height,
          objectFit: 'contain',
        }}
      />
    </View>
  );
};

interface PDFImageBarProps {
  /** Bar width in pixels */
  width?: number;
  /** Bar height in pixels */
  height?: number;
  style?: Styles;
}

/**
 * Decorative gradient bar using pre-rendered PNG
 * Sizes follow GradientTitle.tsx specifications
 */
export const PDFImageBar = ({ 
  width = 96, 
  height = 8,
  style
}: PDFImageBarProps) => {
  return (
    <View style={[styles.barContainer, style]}>
      <Image
        src={barGradient}
        style={{
          width,
          height,
          objectFit: 'cover',
        }}
      />
    </View>
  );
};

// Pre-configured bar sizes matching design system
export const PDFBarSizes = {
  sm: { width: 48, height: 4 },
  md: { width: 80, height: 6 },
  lg: { width: 96, height: 8 },
  xl: { width: 128, height: 10 },
} as const;

export const PDFImageBarSized = ({ 
  size = 'md',
  style
}: { size?: keyof typeof PDFBarSizes; style?: Styles }) => {
  const { width, height } = PDFBarSizes[size];
  return <PDFImageBar width={width} height={height} style={style} />;
};
