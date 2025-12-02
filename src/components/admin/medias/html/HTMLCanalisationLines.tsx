import React from 'react';
import { IARCHE_COLORS, ThemeType } from './tokens';

interface HTMLCanalisationLinesProps {
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Theme affects colors */
  theme?: ThemeType;
  /** Opacity of lines */
  opacity?: number;
  /** Stroke width */
  strokeWidth?: number;
  className?: string;
}

/**
 * Reproduction exacte des lignes canalisations du hero-section
 * Lignes figées à t=6s de l'animation (fully drawn state)
 * 
 * Line 1: Right → Left corner → Down → Exit Left
 * Line 2: Left → Right corner → Down → Exit Right
 */
export const HTMLCanalisationLines: React.FC<HTMLCanalisationLinesProps> = ({
  width,
  height,
  theme = 'dark',
  opacity = 0.6,
  strokeWidth = 7,
  className = '',
}) => {
  const isDark = theme === 'dark';
  
  // Colors based on theme - ensuring visibility
  // Dark (bleu nuit): terracotta lines
  // Light (blanc cassé): bleuNuit and terracotta gradient
  const line1Color = isDark ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const line2Color = IARCHE_COLORS.terracotta;

  // ============================================
  // LINE 1: Right → Left → Down → Exit Left
  // Proportions from hero viewBox 177×159
  // ============================================
  const l1 = {
    startX: width * 0.994,      // 176/177 ≈ 99.4%
    startY: height * 0.006,     // 1/159 ≈ 0.6%
    cornerX: width * 0.291,     // 51.5/177 ≈ 29.1%
    cornerY: height * 0.006,
    endX: 0,
    endY: height * 0.365,       // 58/159 ≈ 36.5%
  };
  
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
  // Proportions from hero viewBox 176×59
  // ============================================
  const l2 = {
    startX: 0,
    startY: height * 0.017,     // 1/59 ≈ 1.7%
    cornerX: width * 0.707,     // 124.5/176 ≈ 70.7%
    cornerY: height * 0.017,
    endX: width,
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
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Gradient for line 1 on light theme */}
        <linearGradient id="canalisation-gradient-1" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
        </linearGradient>
        {/* Gradient for line 2 */}
        <linearGradient id="canalisation-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={IARCHE_COLORS.terracotta} />
          <stop offset="100%" stopColor={IARCHE_COLORS.bleuNuit} />
        </linearGradient>
      </defs>
      
      {/* Line 1 - Right to Left */}
      <path
        d={path1}
        fill="none"
        stroke={isDark ? line1Color : 'url(#canalisation-gradient-1)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
      
      {/* Line 2 - Left to Right */}
      <path
        d={path2}
        fill="none"
        stroke={isDark ? line2Color : 'url(#canalisation-gradient-2)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
    </svg>
  );
};

export default HTMLCanalisationLines;
