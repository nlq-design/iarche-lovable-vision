import { View } from '@react-pdf/renderer';
import { PDFLogo } from './PDFLogo';
import { PDFGradientBar } from './PDFGradientBar';
import { BAR_SIZES, LOGO_BAR_GAP, BarSize, LogoSize } from './tokens';

interface PDFLogoWithBarProps {
  size?: LogoSize;
  /** Override bar size (default: proportional to logo) */
  barSize?: BarSize;
  /** Dark theme for dark backgrounds */
  isDark?: boolean;
  style?: object;
}

/**
 * Logo IArche avec barre décorative obligatoire (PDF)
 * Selon la charte graphique 3.1, le logo doit TOUJOURS être accompagné de sa barre
 * 
 * Proportions synchronisées avec HTML:
 * - xs: barre 24×2 (pour exports ~100px)
 * - sm: barre 48×2 (pour logo sm 24px)
 * - md: barre 64×3 (pour exports ~250px)
 * - lg: barre 80×4 (pour logo lg 48px)
 * - xl: barre 120×5 (pour exports ~500px)
 * - 2xl: barre 160×6 (pour exports plus grands)
 */
export const PDFLogoWithBar = ({
  size = 'md',
  barSize,
  isDark = false,
  style = {},
}: PDFLogoWithBarProps) => {
  // Barre proportionnelle par défaut
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
      <PDFLogo size={size} />
      <PDFGradientBar size={effectiveBarSize} isDark={isDark} />
    </View>
  );
};

export default PDFLogoWithBar;
