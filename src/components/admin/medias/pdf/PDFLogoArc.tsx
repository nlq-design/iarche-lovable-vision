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

  const viewBoxWidth = 200;
  const viewBoxHeight = 24;
  
  const arcPath = `M 0 20 Q 50 0, 100 8 Q 150 14, 200 18 L 200 22 Q 150 19, 100 14 Q 50 8, 0 24 Z`;

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
