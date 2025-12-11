import { View } from '@react-pdf/renderer';
import { PDFLogo } from './PDFLogo';
import { PDFGradientBar } from './PDFGradientBar';
import { LOGO_SIZES_PDF, BAR_SIZES } from './tokens';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
type BarSize = 'sm' | 'md' | 'lg' | 'xl';

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
 * Proportions par défaut:
 * - sm (24px) → bar sm (48×2)
 * - md (32px) → bar md (80×4)
 * - lg (48px) → bar lg (96×4)
 * - xl (64px) → bar xl (128×6)
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
  const gap = size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 20;

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
