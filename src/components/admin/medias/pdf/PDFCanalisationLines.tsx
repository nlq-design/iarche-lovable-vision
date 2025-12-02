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
 * Interpolate between two hex colors
 */
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Generate gradient segments for a line
 */
const generateGradientSegments = (
  startColor: string,
  endColor: string,
  numSegments: number = 6
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < numSegments; i++) {
    const factor = i / (numSegments - 1);
    colors.push(interpolateColor(startColor, endColor, factor));
  }
  return colors;
};

/**
 * Canalisation lines matching the hero section animation (frozen at 6s = fully drawn)
 * 
 * Line 1 (top-left): Enters from right, goes down, exits left
 * Line 2 (bottom-right): Enters from left, goes down, exits right
 */
export const PDFCanalisationLines = ({
  width,
  height,
  isDark = true,
  opacity = 0.5,
  strokeWidth = 2,
}: PDFCanalisationLinesProps) => {
  // Responsive calculations
  const minDim = Math.min(width, height);
  const armLength = minDim * 0.22; // Length of horizontal/vertical arms
  const offset = minDim * 0.04; // Distance from edge
  const cornerRadius = 3; // Rounded corner radius
  
  // Colors based on theme
  const bleuNuit = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.bleuNuit;
  const terracotta = IARCHE_COLORS.terracotta;
  
  // Generate gradient segments (6 segments for smooth transition)
  const segments1 = generateGradientSegments(bleuNuit, terracotta, 6);
  const segments2 = generateGradientSegments(terracotta, bleuNuit, 6);
  
  // === LINE 1: Top-left (entering) ===
  // Shape: horizontal from right → corner → vertical down → horizontal to left edge
  // M(start) → L(horizontal) → Q(corner) → L(vertical) → Q(corner) → L(end)
  
  const line1 = {
    // Start point (right side of arm)
    startX: armLength + offset,
    startY: offset,
    // Corner point
    cornerX: offset + cornerRadius,
    cornerY: offset,
    // Vertical arm
    verticalEndY: armLength * 0.4 + offset,
    // End point
    endX: offset,
    endY: armLength * 0.4 + offset,
  };
  
  // Calculate segment points for Line 1
  const line1Segments: { d: string; color: string }[] = [];
  const totalLine1Length = (line1.startX - line1.cornerX) + (line1.verticalEndY - line1.cornerY);
  const segmentLength1 = totalLine1Length / segments1.length;
  
  // Horizontal segment
  const horizLength1 = line1.startX - line1.cornerX - cornerRadius;
  const horizSegments1 = Math.ceil((horizLength1 / totalLine1Length) * segments1.length);
  
  for (let i = 0; i < segments1.length; i++) {
    const segStart = i * segmentLength1;
    const segEnd = (i + 1) * segmentLength1;
    
    if (segEnd <= horizLength1) {
      // Fully in horizontal section
      const x1 = line1.startX - segStart;
      const x2 = line1.startX - segEnd;
      line1Segments.push({
        d: `M ${x1} ${line1.startY} L ${x2} ${line1.startY}`,
        color: segments1[i],
      });
    } else if (segStart >= horizLength1) {
      // Fully in vertical section
      const y1 = line1.cornerY + (segStart - horizLength1);
      const y2 = line1.cornerY + (segEnd - horizLength1);
      line1Segments.push({
        d: `M ${line1.endX} ${Math.min(y1, line1.verticalEndY)} L ${line1.endX} ${Math.min(y2, line1.verticalEndY)}`,
        color: segments1[i],
      });
    } else {
      // Transition segment (includes corner)
      const x1 = line1.startX - segStart;
      const y2 = line1.cornerY + (segEnd - horizLength1);
      line1Segments.push({
        d: `M ${x1} ${line1.startY} L ${line1.cornerX + cornerRadius} ${line1.startY} Q ${line1.cornerX} ${line1.startY} ${line1.cornerX} ${line1.cornerY + cornerRadius} L ${line1.endX} ${Math.min(y2, line1.verticalEndY)}`,
        color: segments1[i],
      });
    }
  }
  
  // === LINE 2: Bottom-right (exiting) ===
  const line2 = {
    startX: width - armLength - offset,
    startY: height - offset,
    cornerX: width - offset - cornerRadius,
    cornerY: height - offset,
    verticalStartY: height - armLength * 0.4 - offset,
    endX: width - offset,
    endY: height - armLength * 0.4 - offset,
  };
  
  // Calculate segment points for Line 2
  const line2Segments: { d: string; color: string }[] = [];
  const totalLine2Length = (line2.cornerX - line2.startX) + (line2.cornerY - line2.verticalStartY);
  
  for (let i = 0; i < segments2.length; i++) {
    const segStart = i * (totalLine2Length / segments2.length);
    const segEnd = (i + 1) * (totalLine2Length / segments2.length);
    const horizLength2 = line2.cornerX - line2.startX - cornerRadius;
    
    if (segEnd <= horizLength2) {
      // Fully in horizontal section
      const x1 = line2.startX + segStart;
      const x2 = line2.startX + segEnd;
      line2Segments.push({
        d: `M ${x1} ${line2.startY} L ${x2} ${line2.startY}`,
        color: segments2[i],
      });
    } else if (segStart >= horizLength2) {
      // Fully in vertical section
      const y1 = line2.cornerY - (segStart - horizLength2);
      const y2 = line2.cornerY - (segEnd - horizLength2);
      line2Segments.push({
        d: `M ${line2.endX} ${Math.max(y1, line2.verticalStartY)} L ${line2.endX} ${Math.max(y2, line2.verticalStartY)}`,
        color: segments2[i],
      });
    } else {
      // Transition segment (includes corner)
      const x1 = line2.startX + segStart;
      const y2 = line2.cornerY - (segEnd - horizLength2);
      line2Segments.push({
        d: `M ${x1} ${line2.startY} L ${line2.cornerX - cornerRadius} ${line2.startY} Q ${line2.cornerX} ${line2.startY} ${line2.cornerX} ${line2.cornerY - cornerRadius} L ${line2.endX} ${Math.max(y2, line2.verticalStartY)}`,
        color: segments2[i],
      });
    }
  }
  
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
      {/* Line 1 - Top-left (Bleu Nuit → Terracotta) */}
      {line1Segments.map((seg, idx) => (
        <Path
          key={`line1-${idx}`}
          d={seg.d}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      ))}
      
      {/* Line 2 - Bottom-right (Terracotta → Bleu Nuit) */}
      {line2Segments.map((seg, idx) => (
        <Path
          key={`line2-${idx}`}
          d={seg.d}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      ))}
    </Svg>
  );
};

/**
 * Simplified version with solid gradient-like effect using two colors
 * Uses a single path per line with a midpoint color stop simulation
 */
export const PDFCanalisationLinesSimple = ({
  width,
  height,
  isDark = true,
  opacity = 0.6,
  strokeWidth = 2,
}: PDFCanalisationLinesProps) => {
  const minDim = Math.min(width, height);
  const armLength = minDim * 0.22;
  const offset = minDim * 0.04;
  const cornerRadius = 4;
  
  const primaryColor = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const secondaryColor = isDark ? IARCHE_COLORS.bleuNuitLight : IARCHE_COLORS.terracotta;
  
  // Line 1: Top-left L shape
  const line1Path = `
    M ${armLength + offset} ${offset}
    L ${offset + cornerRadius} ${offset}
    Q ${offset} ${offset} ${offset} ${offset + cornerRadius}
    L ${offset} ${armLength * 0.4 + offset}
  `;
  
  // Line 2: Bottom-right inverted L shape
  const line2Path = `
    M ${width - armLength - offset} ${height - offset}
    L ${width - offset - cornerRadius} ${height - offset}
    Q ${width - offset} ${height - offset} ${width - offset} ${height - offset - cornerRadius}
    L ${width - offset} ${height - armLength * 0.4 - offset}
  `;
  
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
      {/* Line 1 - Primary color */}
      <Path
        d={line1Path}
        fill="none"
        stroke={primaryColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* Line 2 - Secondary color */}
      <Path
        d={line2Path}
        fill="none"
        stroke={secondaryColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity * 0.8}
      />
    </Svg>
  );
};
