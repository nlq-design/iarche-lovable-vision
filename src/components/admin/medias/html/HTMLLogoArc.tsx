import React from 'react';
import { IARCHE_COLORS, ArcSize } from './tokens';

interface HTMLLogoArcProps {
  size?: ArcSize;
  className?: string;
}

/**
 * Arc décoratif IArche pour HTML - Version v4.0
 * 
 * Reproduction exacte de la virgule du logo officiel
 * Remplace HTMLGradientBar
 */
export const HTMLLogoArc: React.FC<HTMLLogoArcProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeConfig = {
    sm: { width: 80, height: 10 },
    md: { width: 120, height: 14 },
    lg: { width: 180, height: 20 },
    xl: { width: 260, height: 28 },
  };

  const { width, height } = sizeConfig[size];
  const gradientId = `htmlLogoArc-${size}-${Math.random().toString(36).substr(2, 9)}`;

  // ViewBox et path extraits EXACTEMENT du logo officiel iarche-main.svg
  const viewBoxWidth = 200;
  const viewBoxHeight = 24;
  
  // Path exact de l'arc officiel IArche v4.0
  const arcPath = `M 0 22 C 0 22 58 -6 100 10 C 142 26 200 18 200 18 L 200 20 C 200 20 142 30 100 14 C 58 -2 0 24 0 24 Z`;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
          <stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
        </linearGradient>
      </defs>
      <path
        d={arcPath}
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};

export default HTMLLogoArc;
