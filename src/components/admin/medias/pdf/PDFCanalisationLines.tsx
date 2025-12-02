import { View, Svg, Path, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
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
 * 
 * Website SVG specifications:
 * - Line 1: viewBox="0 0 177 159", preserveAspectRatio="none"
 *   Path: M176 1 L53.5359 1 C52.4313 1 51.5359 1.89543 51.5359 3 L51.5359 56 C51.5359 57.1046 50.6405 58 49.5359 58 L0 58
 *   → Starts RIGHT edge, goes LEFT, curves DOWN, exits LEFT edge
 * 
 * - Line 2: viewBox="0 0 176 59", preserveAspectRatio="none"
 *   Path: M0 1 L122.464 1 C123.569 1 124.464 1.89543 124.464 3 L124.464 56 C124.464 57.1046 125.36 58 126.464 58 L176 58
 *   → Starts LEFT edge, goes RIGHT, curves DOWN, exits RIGHT edge
 * 
 * Stroke: 2px, opacity: 0.5
 * Gradients: Line1 = BleuNuit→Terracotta, Line2 = Terracotta→BleuNuit
 */
export const PDFCanalisationLines = ({
  width,
  height,
  isDark = true,
  opacity = 0.5,
  strokeWidth = 2,
}: PDFCanalisationLinesProps) => {
  // Colors based on theme
  const bleuNuit = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.bleuNuit;
  const terracotta = IARCHE_COLORS.terracotta;
  
  // ============================================
  // LINE 1: Right → Left → Down → Exit Left
  // Original viewBox: 0 0 177 159
  // ============================================
  const vb1 = { w: 177, h: 159 };
  
  // Scale coordinates to page dimensions
  const l1 = {
    // Start point (right edge, near top)
    startX: (176 / vb1.w) * width,
    startY: (1 / vb1.h) * height,
    // Horizontal end (before curve)
    horizEndX: (53.5359 / vb1.w) * width,
    horizEndY: (1 / vb1.h) * height,
    // Curve control point 1
    c1x: (52.4313 / vb1.w) * width,
    c1y: (1 / vb1.h) * height,
    // Curve end / vertical start
    curveEndX: (51.5359 / vb1.w) * width,
    curveEndY: (1.89543 / vb1.h) * height,
    // Vertical line start (after first curve)
    vertStartX: (51.5359 / vb1.w) * width,
    vertStartY: (3 / vb1.h) * height,
    // Vertical line end (before second curve)
    vertEndX: (51.5359 / vb1.w) * width,
    vertEndY: (56 / vb1.h) * height,
    // Second curve control
    c2x: (51.5359 / vb1.w) * width,
    c2y: (57.1046 / vb1.h) * height,
    // Second curve end
    curve2EndX: (50.6405 / vb1.w) * width,
    curve2EndY: (58 / vb1.h) * height,
    // Final horizontal to left edge
    endX: 0,
    endY: (58 / vb1.h) * height,
  };
  
  // Build exact path for Line 1
  const path1 = `
    M ${l1.startX} ${l1.startY}
    L ${l1.horizEndX} ${l1.horizEndY}
    C ${l1.c1x} ${l1.c1y} ${l1.curveEndX} ${l1.curveEndY} ${l1.vertStartX} ${l1.vertStartY}
    L ${l1.vertEndX} ${l1.vertEndY}
    C ${l1.c2x} ${l1.c2y} ${l1.curve2EndX} ${l1.curve2EndY} ${l1.endX} ${l1.endY}
  `.replace(/\s+/g, ' ').trim();
  
  // ============================================
  // LINE 2: Left → Right → Down → Exit Right
  // Original viewBox: 0 0 176 59
  // ============================================
  const vb2 = { w: 176, h: 59 };
  
  const l2 = {
    // Start point (left edge, near top)
    startX: 0,
    startY: (1 / vb2.h) * height,
    // Horizontal end (before curve)
    horizEndX: (122.464 / vb2.w) * width,
    horizEndY: (1 / vb2.h) * height,
    // Curve control point 1
    c1x: (123.569 / vb2.w) * width,
    c1y: (1 / vb2.h) * height,
    // Curve end / vertical start
    curveEndX: (124.464 / vb2.w) * width,
    curveEndY: (1.89543 / vb2.h) * height,
    // Vertical line start
    vertStartX: (124.464 / vb2.w) * width,
    vertStartY: (3 / vb2.h) * height,
    // Vertical line end
    vertEndX: (124.464 / vb2.w) * width,
    vertEndY: (56 / vb2.h) * height,
    // Second curve control
    c2x: (124.464 / vb2.w) * width,
    c2y: (57.1046 / vb2.h) * height,
    // Second curve end
    curve2EndX: (125.36 / vb2.w) * width,
    curve2EndY: (58 / vb2.h) * height,
    // Final horizontal to right edge
    endX: width,
    endY: (58 / vb2.h) * height,
  };
  
  // Build exact path for Line 2
  const path2 = `
    M ${l2.startX} ${l2.startY}
    L ${l2.horizEndX} ${l2.horizEndY}
    C ${l2.c1x} ${l2.c1y} ${l2.curveEndX} ${l2.curveEndY} ${l2.vertStartX} ${l2.vertStartY}
    L ${l2.vertEndX} ${l2.vertEndY}
    C ${l2.c2x} ${l2.c2y} ${l2.curve2EndX} ${l2.curve2EndY} ${l2.endX} ${l2.endY}
  `.replace(/\s+/g, ' ').trim();
  
  // Unique gradient IDs for this instance
  const gradId1 = `canalGrad1-${width}-${height}`;
  const gradId2 = `canalGrad2-${width}-${height}`;
  
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
      <Defs>
        {/* Gradient 1: Bleu Nuit → Terracotta (diagonal) */}
        <LinearGradient id={gradId1} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={bleuNuit} />
          <Stop offset="100%" stopColor={terracotta} />
        </LinearGradient>
        
        {/* Gradient 2: Terracotta → Bleu Nuit (inverse diagonal) */}
        <LinearGradient id={gradId2} x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={terracotta} />
          <Stop offset="100%" stopColor={bleuNuit} />
        </LinearGradient>
      </Defs>
      
      {/* Line 1 - Right to Left (Bleu Nuit → Terracotta) */}
      <Path
        d={path1}
        fill="none"
        stroke={`url(#${gradId1})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* Line 2 - Left to Right (Terracotta → Bleu Nuit) */}
      <Path
        d={path2}
        fill="none"
        stroke={`url(#${gradId2})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
    </Svg>
  );
};

/**
 * Fallback version with solid colors if gradients don't render
 * Uses the exact same paths but with solid stroke colors
 */
export const PDFCanalisationLinesSimple = ({
  width,
  height,
  isDark = true,
  opacity = 0.5,
  strokeWidth = 2,
}: PDFCanalisationLinesProps) => {
  const primaryColor = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const secondaryColor = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.terracotta;
  
  // Same coordinate calculations as main component
  const vb1 = { w: 177, h: 159 };
  const l1 = {
    startX: (176 / vb1.w) * width,
    startY: (1 / vb1.h) * height,
    horizEndX: (53.5359 / vb1.w) * width,
    horizEndY: (1 / vb1.h) * height,
    c1x: (52.4313 / vb1.w) * width,
    c1y: (1 / vb1.h) * height,
    curveEndX: (51.5359 / vb1.w) * width,
    curveEndY: (1.89543 / vb1.h) * height,
    vertStartX: (51.5359 / vb1.w) * width,
    vertStartY: (3 / vb1.h) * height,
    vertEndX: (51.5359 / vb1.w) * width,
    vertEndY: (56 / vb1.h) * height,
    c2x: (51.5359 / vb1.w) * width,
    c2y: (57.1046 / vb1.h) * height,
    curve2EndX: (50.6405 / vb1.w) * width,
    curve2EndY: (58 / vb1.h) * height,
    endX: 0,
    endY: (58 / vb1.h) * height,
  };
  
  const path1 = `
    M ${l1.startX} ${l1.startY}
    L ${l1.horizEndX} ${l1.horizEndY}
    C ${l1.c1x} ${l1.c1y} ${l1.curveEndX} ${l1.curveEndY} ${l1.vertStartX} ${l1.vertStartY}
    L ${l1.vertEndX} ${l1.vertEndY}
    C ${l1.c2x} ${l1.c2y} ${l1.curve2EndX} ${l1.curve2EndY} ${l1.endX} ${l1.endY}
  `.replace(/\s+/g, ' ').trim();
  
  const vb2 = { w: 176, h: 59 };
  const l2 = {
    startX: 0,
    startY: (1 / vb2.h) * height,
    horizEndX: (122.464 / vb2.w) * width,
    horizEndY: (1 / vb2.h) * height,
    c1x: (123.569 / vb2.w) * width,
    c1y: (1 / vb2.h) * height,
    curveEndX: (124.464 / vb2.w) * width,
    curveEndY: (1.89543 / vb2.h) * height,
    vertStartX: (124.464 / vb2.w) * width,
    vertStartY: (3 / vb2.h) * height,
    vertEndX: (124.464 / vb2.w) * width,
    vertEndY: (56 / vb2.h) * height,
    c2x: (124.464 / vb2.w) * width,
    c2y: (57.1046 / vb2.h) * height,
    curve2EndX: (125.36 / vb2.w) * width,
    curve2EndY: (58 / vb2.h) * height,
    endX: width,
    endY: (58 / vb2.h) * height,
  };
  
  const path2 = `
    M ${l2.startX} ${l2.startY}
    L ${l2.horizEndX} ${l2.horizEndY}
    C ${l2.c1x} ${l2.c1y} ${l2.curveEndX} ${l2.curveEndY} ${l2.vertStartX} ${l2.vertStartY}
    L ${l2.vertEndX} ${l2.vertEndY}
    C ${l2.c2x} ${l2.c2y} ${l2.curve2EndX} ${l2.curve2EndY} ${l2.endX} ${l2.endY}
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
      {/* Line 1 - Solid primary color */}
      <Path
        d={path1}
        fill="none"
        stroke={primaryColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* Line 2 - Solid secondary color */}
      <Path
        d={path2}
        fill="none"
        stroke={secondaryColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
    </Svg>
  );
};
