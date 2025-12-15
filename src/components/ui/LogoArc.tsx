import React from 'react';
import { cn } from '@/lib/utils';

interface LogoArcProps {
  /** Taille de l'arc */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
  /** Animer l'arc (drawing effect) */
  animated?: boolean;
}

/**
 * Arc décoratif IArche v4.0
 * 
 * Reproduction exacte de la "virgule" du logo officiel
 * (la courbe qui relie le I au E)
 * 
 * Utilisé sous les titres et comme élément décoratif
 * Remplace toutes les barres gradient horizontales
 */
const LogoArc: React.FC<LogoArcProps> = ({
  size = 'md',
  className = '',
  animated = false,
}) => {
  const sizeConfig = {
    sm: { width: 60, height: 8 },
    md: { width: 100, height: 12 },
    lg: { width: 160, height: 18 },
    xl: { width: 220, height: 24 },
  };

  const { width, height } = sizeConfig[size];
  
  // Gradient IDs uniques pour éviter les conflits
  const gradientId = `logoArcGradient-${size}-${Math.random().toString(36).substr(2, 9)}`;

  // Path simplifié de l'arc du logo officiel
  // Reproduit la forme de la virgule qui va du I au E
  // ViewBox normalisée pour faciliter le scaling
  const viewBoxWidth = 100;
  const viewBoxHeight = 12;
  
  // Courbe bézier reproduisant l'arc du logo
  // Commence large à gauche, s'affine vers la droite
  const arcPath = `
    M 0 10
    C 25 0, 50 2, 75 6
    C 85 7.5, 95 9, 100 10
    L 100 12
    C 95 11, 85 9.5, 75 8
    C 50 4, 25 2, 0 12
    Z
  `.replace(/\s+/g, ' ').trim();

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
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="hsl(218, 47%, 20%)" /> {/* Bleu Nuit */}
          <stop offset="100%" stopColor="hsl(12, 60%, 44%)" /> {/* Terracotta */}
        </linearGradient>
      </defs>
      <path
        d={arcPath}
        fill={`url(#${gradientId})`}
        className={animated ? 'arc-path' : ''}
      />
    </svg>
  );
};

export default LogoArc;
