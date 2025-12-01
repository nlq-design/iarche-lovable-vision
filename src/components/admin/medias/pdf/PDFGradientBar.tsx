import { Svg, Defs, LinearGradient, Stop, Rect } from '@react-pdf/renderer';
import { BAR_SIZES, IARCHE_COLORS } from './tokens';

interface PDFGradientBarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: object;
}

/**
 * Decorative gradient bar following IArche brand guidelines
 * Gradient: BleuNuit → Terracotta → BleuNuit
 * 
 * Sizes (from GradientTitle.tsx):
 * - sm: 48×2px - Cards, placeholders
 * - md: 80×4px - Section titles
 * - lg: 96×4px - Page titles
 * - xl: 128×6px - Hero sections
 */
export const PDFGradientBar = ({ size = 'md', style = {} }: PDFGradientBarProps) => {
  const { width, height } = BAR_SIZES[size];
  
  return (
    <Svg 
      viewBox={`0 0 ${width} ${height}`} 
      style={{ 
        width, 
        height, 
        marginTop: 8,
        ...style,
      }}
    >
      <Defs>
        <LinearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
        </LinearGradient>
      </Defs>
      <Rect 
        width={width} 
        height={height} 
        rx={height / 2} 
        fill="url(#barGradient)" 
      />
    </Svg>
  );
};
