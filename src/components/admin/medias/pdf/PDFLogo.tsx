import { Svg, Defs, LinearGradient, Stop, Text, View } from '@react-pdf/renderer';
import { LOGO_SIZES_PDF, IARCHE_COLORS } from './tokens';

interface PDFLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * IArche logo with gradient effect (static version for PDF)
 * Gradient frozen at 50% of animation cycle: BleuNuit → Terracotta → BleuNuit
 */
export const PDFLogo = ({ size = 'md' }: PDFLogoProps) => {
  const config = LOGO_SIZES_PDF[size];
  
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg viewBox={config.viewBox} style={{ width: config.width, height: config.fontSize + 8 }}>
        <Defs>
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
            <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
            <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
          </LinearGradient>
        </Defs>
        <Text
          x="0"
          y={config.fontSize}
          fill="url(#logoGradient)"
          style={{
            fontFamily: 'Manrope',
            fontWeight: 700,
            fontSize: config.fontSize,
          }}
        >
          IArche
        </Text>
      </Svg>
    </View>
  );
};

/**
 * Alternative: Simple text logo when SVG text isn't rendering properly
 * Uses Terracotta accent color as fallback
 */
export const PDFLogoText = ({ size = 'md' }: PDFLogoProps) => {
  const fontSizes = { sm: 32, md: 52, lg: 72 };
  
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: fontSizes[size],
          fontWeight: 'bold',
          color: IARCHE_COLORS.terracotta,
          fontFamily: 'Helvetica-Bold',
        }}
      >
        IArche
      </Text>
    </View>
  );
};
