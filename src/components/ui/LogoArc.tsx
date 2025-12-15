import React from 'react';
import { cn } from '@/lib/utils';

interface LogoArcProps {
  /** Taille de l'arc */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Theme: détermine la direction du gradient */
  theme?: 'light' | 'dark';
  /** Classes CSS additionnelles */
  className?: string;
  /** Animer l'arc (drawing effect) */
  animated?: boolean;
}

/**
 * Arc décoratif IArche v4.0
 * 
 * Remplace la barre gradient horizontale
 * Utilisé sous les titres et comme élément décoratif
 */
const LogoArc: React.FC<LogoArcProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  animated = false,
}) => {
  const sizeConfig = {
    sm: { width: 48, height: 12, strokeWidth: 1.5 },
    md: { width: 80, height: 20, strokeWidth: 2 },
    lg: { width: 120, height: 30, strokeWidth: 2.5 },
    xl: { width: 160, height: 40, strokeWidth: 3 },
  };

  const { width, height, strokeWidth } = sizeConfig[size];
  const gradientId = `arcGradient-${size}-${theme}`;

  // L'arc est un demi-cercle/ellipse
  // viewBox adapté pour un arc horizontal
  const viewBoxWidth = 100;
  const viewBoxHeight = 30;
  
  // Path d'arc: M(start) A(rx ry rotation large-arc sweep end)
  const arcPath = `M 5 25 A 45 20 0 0 1 95 25`;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={width}
      height={height}
      className={cn(
        'block',
        animated && 'animate-arc-draw',
        className
      )}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <path
        d={arcPath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={animated ? 'arc-path' : ''}
      />
    </svg>
  );
};

export default LogoArc;
