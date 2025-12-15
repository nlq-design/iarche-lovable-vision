import { View, Image } from '@react-pdf/renderer';
import { LOGO_SIZES_PDF } from './tokens';

interface PDFLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Dark theme - use white logo on dark backgrounds */
  isDark?: boolean;
}

const LOGO_HEIGHTS: Record<string, number> = {
  sm: 24,
  md: 40,
  lg: 56,
  xl: 80,
};

/**
 * IArche logo v4.0 pour PDF
 * Utilise les images PNG du logo officiel
 */
export const PDFLogo = ({ size = 'md', isDark = false }: PDFLogoProps) => {
  const height = LOGO_HEIGHTS[size] || 40;
  
  // Logo PNG selon le thème
  const logoSrc = isDark 
    ? '/logos/iarche-white.png'
    : '/logos/iarche-main.png';
  
  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        src={logoSrc}
        style={{ height, objectFit: 'contain' }}
      />
    </View>
  );
};

/**
 * Alternative: Logo texte simple pour fallback
 * Deprecated - préférer PDFLogo avec images
 */
export const PDFLogoText = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const fontSizes = { sm: 32, md: 52, lg: 72 };
  
  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        src="/logos/iarche-main.png"
        style={{ height: fontSizes[size] * 0.6, objectFit: 'contain' }}
      />
    </View>
  );
};
