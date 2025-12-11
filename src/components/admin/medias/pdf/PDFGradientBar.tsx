import { Svg, Defs, LinearGradient, Stop, Rect } from '@react-pdf/renderer';
import { BAR_SIZES, IARCHE_COLORS, BarSize } from './tokens';

// Counter for unique gradient IDs to avoid conflicts when multiple bars render
let barGradientCounter = 0;

interface PDFGradientBarProps {
  size?: BarSize;
  /** Custom width override */
  width?: number;
  /** Custom height override */
  height?: number;
  /** Dark theme (Bleu Nuit background) - adapts gradient colors for visibility */
  isDark?: boolean;
  style?: object;
}

/**
 * Decorative gradient bar following IArche brand guidelines
 * 
 * Gradient adapts to background for visibility:
 * - Light background: BleuNuit → Terracotta → BleuNuit
 * - Dark background: BleuNuitLight → Terracotta → BleuNuitLight (lightened for visibility)
 * 
 * Uses native react-pdf SVG components for reliable rendering.
 * Each bar gets a unique gradient ID to prevent conflicts.
 * 
 * Sizes synchronisées avec HTML:
 * - xs: 24×2px - Pour exports ~100px
 * - sm: 48×2px - Logo sm
 * - md: 64×3px - Pour exports ~250px  
 * - lg: 80×4px - Logo lg
 * - xl: 120×5px - Pour exports ~500px
 * - 2xl: 160×6px - Exports plus grands
 */
export const PDFGradientBar = ({ 
  size = 'md', 
  width: customWidth, 
  height: customHeight,
  isDark = false,
  style = {} 
}: PDFGradientBarProps) => {
  const defaultSize = BAR_SIZES[size];
  const barWidth = customWidth || defaultSize.width;
  const barHeight = customHeight || defaultSize.height;
  
  // Generate unique ID for this gradient to avoid conflicts
  const gradientId = `barGradient-${barGradientCounter++}`;
  
  // Adapt colors based on background theme
  // On dark background, use lightened BleuNuit for visibility
  const edgeColor = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.bleuNuit;
  const centerColor = IARCHE_COLORS.terracotta;
  
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
          <Stop offset="0%" stopColor={edgeColor} />
          <Stop offset="50%" stopColor={centerColor} />
          <Stop offset="100%" stopColor={edgeColor} />
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
