import { Svg, Path } from '@react-pdf/renderer';
import { IARCHE_COLORS } from './tokens';

interface PDFCanalisationLinesProps {
  /** Page width */
  width: number;
  /** Page height */
  height: number;
  /** Dark theme (affects colors) */
  isDark?: boolean;
  /** Opacity of lines */
  opacity?: number;
  /** Stroke width */
  strokeWidth?: number;
}

/**
 * Exact reproduction of hero-section.tsx canalisation lines
 * Using straight lines with proper proportions matching the website
 * 
 * Website behavior with preserveAspectRatio="none":
 * - Line 1: Starts ~99% right, goes to ~30% left, then down to ~36% height, exits left
 * - Line 2: Starts left edge, goes to ~70% right, then down to ~98% height, exits right
 * 
 * Colors match the gradient effect:
 * - Dark theme: terracotta (line 1) + white/light (line 2) for visibility
 * - Light theme: bleuNuit (line 1) + terracotta (line 2)
 */
export const PDFCanalisationLines = ({
  width,
  height,
  isDark = true,
  opacity = 0.6,
  strokeWidth = 7,
}: PDFCanalisationLinesProps) => {
  // Colors based on theme - ensuring visibility on both backgrounds
  // On dark (bleu nuit) background: both lines terracotta
  // On light (blanc cassé) background: bleuNuit and terracotta
  const line1Color = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const line2Color = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.terracotta;
  
  // Same opacity for both lines
  const line1Opacity = opacity;
  const line2Opacity = opacity;
  
  // ============================================
  // LINE 1: Right → Left → Down → Exit Left
  // Proportions from viewBox 177×159 with preserveAspectRatio="none"
  // ============================================
  const l1 = {
    startX: width * 0.994,      // 176/177 ≈ 99.4%
    startY: height * 0.006,     // 1/159 ≈ 0.6%
    cornerX: width * 0.291,     // 51.5/177 ≈ 29.1%
    cornerY: height * 0.006,    // Same Y as start
    endX: 0,                    // Left edge
    endY: height * 0.365,       // 58/159 ≈ 36.5%
  };
  
  // Path with rounded corner (Q = quadratic bezier for smooth corner)
  const cornerRadius1 = Math.min(width, height) * 0.012;
  const path1 = `
    M ${l1.startX} ${l1.startY}
    L ${l1.cornerX + cornerRadius1} ${l1.cornerY}
    Q ${l1.cornerX} ${l1.cornerY} ${l1.cornerX} ${l1.cornerY + cornerRadius1}
    L ${l1.cornerX} ${l1.endY - cornerRadius1}
    Q ${l1.cornerX} ${l1.endY} ${l1.cornerX - cornerRadius1} ${l1.endY}
    L ${l1.endX} ${l1.endY}
  `.replace(/\s+/g, ' ').trim();
  
  // ============================================
  // LINE 2: Left → Right → Down → Exit Right
  // Proportions from viewBox 176×59 with preserveAspectRatio="none"
  // ============================================
  const l2 = {
    startX: 0,                  // Left edge
    startY: height * 0.017,     // 1/59 ≈ 1.7%
    cornerX: width * 0.707,     // 124.5/176 ≈ 70.7%
    cornerY: height * 0.017,    // Same Y as start
    endX: width,                // Right edge
    endY: height * 0.983,       // 58/59 ≈ 98.3%
  };
  
  const cornerRadius2 = Math.min(width, height) * 0.012;
  const path2 = `
    M ${l2.startX} ${l2.startY}
    L ${l2.cornerX - cornerRadius2} ${l2.cornerY}
    Q ${l2.cornerX} ${l2.cornerY} ${l2.cornerX} ${l2.cornerY + cornerRadius2}
    L ${l2.cornerX} ${l2.endY - cornerRadius2}
    Q ${l2.cornerX} ${l2.endY} ${l2.cornerX + cornerRadius2} ${l2.endY}
    L ${l2.endX} ${l2.endY}
  `.replace(/\s+/g, ' ').trim();
  
  return (
    <Svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Line 1 - Right to Left (terracotta on dark, bleuNuit on light) */}
      <Path
        d={path1}
        fill="none"
        stroke={line1Color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={line1Opacity}
      />
      
      {/* Line 2 - Left to Right (white on dark, terracotta on light) */}
      <Path
        d={path2}
        fill="none"
        stroke={line2Color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={line2Opacity}
      />
    </Svg>
  );
};

/**
 * Simplified version - same implementation
 */
export const PDFCanalisationLinesSimple = PDFCanalisationLines;
