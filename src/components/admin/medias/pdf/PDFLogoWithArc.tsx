import { View } from '@react-pdf/renderer';
import { PDFLogo } from './PDFLogo';
import { PDFLogoArc } from './PDFLogoArc';
import { ArcSize, LogoSize } from './tokens';

interface PDFLogoWithArcProps {
  size?: LogoSize;
  /** Override arc size (default: proportional to logo) */
  arcSize?: ArcSize;
  style?: object;
}

/**
 * Logo IArche avec arc décoratif (PDF) - Version v4.0
 * 
 * L'arc est l'élément d'identité qui accompagne le logo
 * ATTENTION: L'arc ne doit PAS être utilisé sous le logo dans les cards
 * Utiliser ce composant uniquement pour les contextes d'identité (headers, footers)
 */
export const PDFLogoWithArc = ({
  size = 'md',
  arcSize,
  style = {},
}: PDFLogoWithArcProps) => {
  // Arc proportionnel par défaut
  const effectiveArcSize: ArcSize = arcSize || size;

  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        ...style,
      }}
    >
      <PDFLogo size={size} />
      <PDFLogoArc size={effectiveArcSize} />
    </View>
  );
};

export default PDFLogoWithArc;
