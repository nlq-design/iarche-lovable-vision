import { Svg, Defs, LinearGradient, Stop, Rect } from '@react-pdf/renderer';
import { BAR_SIZES, IARCHE_COLORS } from './tokens';

// Counter for unique gradient IDs to avoid conflicts when multiple bars render
let barGradientCounter = 0;

interface PDFGradientBarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom width override */
  width?: number;
  /** Custom height override */
  height?: number;
  style?: object;
}

/**
 * Decorative gradient bar following IArche brand guidelines
 * Gradient: BleuNuit → Terracotta → BleuNuit
 * 
 * Uses native react-pdf SVG components for reliable rendering.
 * Each bar gets a unique gradient ID to prevent conflicts.
 * 
 * Sizes (from GradientTitle.tsx):
 * - sm: 48×2px - Cards, placeholders
 * - md: 80×4px - Section titles
 * - lg: 96×4px - Page titles
 * - xl: 128×6px - Hero sections
 */
export const PDFGradientBar = ({ 
  size = 'md', 
  width: customWidth, 
  height: customHeight, 
  style = {} 
}: PDFGradientBarProps) => {
  const defaultSize = BAR_SIZES[size];
  const barWidth = customWidth || defaultSize.width;
  const barHeight = customHeight || defaultSize.height;
  
  // Generate unique ID for this gradient to avoid conflicts
  const gradientId = `barGradient-${barGradientCounter++}`;
  
  return (
    <Svg 
      viewBox={`0 0 ${barWidth} ${barHeight}`} 
      style={{ 
        width: barWidth, 
        height: barHeight, 
        marginTop: 8,
        ...style,
      }}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <Stop offset="50%" stopColor={IARCHE_COLORS.terracotta} />
          <Stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
        </LinearGradient>
      </Defs>
      <Rect 
        width={barWidth} 
        height={barHeight} 
        rx={barHeight / 2} 
        fill={`url(#${gradientId})`} 
      />
    </Svg>
  );
};
