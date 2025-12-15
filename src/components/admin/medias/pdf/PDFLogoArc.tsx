import { Svg, Defs, LinearGradient, Stop, Path } from '@react-pdf/renderer';
import { IARCHE_COLORS, ArcSize } from './tokens';

// Counter for unique gradient IDs
let arcGradientCounter = 0;

interface PDFLogoArcProps {
  size?: ArcSize;
  style?: object;
}

/**
 * Arc décoratif IArche pour PDF - Version v4.0
 * 
 * Reproduction exacte de la virgule du logo officiel
 * Remplace PDFGradientBar pour les exports PDF
 */
export const PDFLogoArc = ({ 
  size = 'md', 
  style = {} 
}: PDFLogoArcProps) => {
  const sizeConfig = {
    sm: { width: 80, height: 10 },
    md: { width: 120, height: 14 },
    lg: { width: 180, height: 20 },
    xl: { width: 260, height: 28 },
  };

  const { width, height } = sizeConfig[size];
  const gradientId = `pdfLogoArc-${arcGradientCounter++}`;

  // ViewBox et path extraits EXACTEMENT du logo officiel iarche-main.svg
  const viewBoxWidth = 200;
  const viewBoxHeight = 24;
  
  // Path exact de l'arc officiel IArche v4.0
  const arcPath = `M 0 22 C 0 22 58 -6 100 10 C 142 26 200 18 200 18 L 200 20 C 200 20 142 30 100 14 C 58 -2 0 24 0 24 Z`;

  return (
    <Svg 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
      style={{ 
        width, 
        height, 
        marginTop: 8,
        ...style,
      }}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
        </LinearGradient>
      </Defs>
      <Path 
        d={arcPath}
        fill={`url(#${gradientId})`} 
      />
    </Svg>
  );
};
