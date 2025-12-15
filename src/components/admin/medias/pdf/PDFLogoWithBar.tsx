import { View } from '@react-pdf/renderer';
import { PDFLogo } from './PDFLogo';
import { PDFLogoArc } from './PDFLogoArc';
import { LOGO_BAR_GAP, BarSize, LogoSize } from './tokens';

interface PDFLogoWithBarProps {
  size?: LogoSize;
  /** Override bar size (default: proportional to logo) */
  barSize?: BarSize;
  /** Dark theme for dark backgrounds */
  isDark?: boolean;
  style?: object;
}

/**
 * Logo IArche v4.0 avec arc décoratif (PDF)
 * 
 * Conforme à la charte graphique 4.0:
 * - Logo SVG/PNG officiel
 * - Arc décoratif (remplace l'ancienne barre gradient)
 */
export const PDFLogoWithBar = ({
  size = 'md',
  barSize,
  isDark = false,
  style = {},
}: PDFLogoWithBarProps) => {
  // Arc proportionnel par défaut
  const effectiveBarSize: BarSize = barSize || size;
  
  // Espacement proportionnel
  const gap = LOGO_BAR_GAP[size] || 12;

  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: gap,
        ...style,
      }}
    >
      <PDFLogo size={size} isDark={isDark} />
      <PDFLogoArc size={effectiveBarSize} />
    </View>
  );
};

export default PDFLogoWithBar;
