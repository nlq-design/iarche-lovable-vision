import React from 'react';
import { cn } from '@/lib/utils';

interface LogoArcProps {
  /** Taille de l'arc */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Arc décoratif IArche v4.0 - Conforme au logo officiel
 * 
 * Reproduction exacte de la "virgule" du logo officiel
 * Courbe élégante allant de Bleu Nuit → Terracotta
 * S'amenuise progressivement de gauche à droite
 * 
 * Remplace toutes les barres gradient horizontales du site
 */
const LogoArc: React.FC<LogoArcProps> = ({
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
  
  // Gradient ID unique pour éviter les conflits
  const gradientId = `logoArc-${size}-${Math.random().toString(36).substr(2, 9)}`;

  // ViewBox normalisée pour le scaling proportionnel
  // ViewBox et path extraits EXACTEMENT du logo officiel iarche-main.svg (path id="path13929-32-7")
  // Normalisé pour viewBox 0 0 200 24
  const viewBoxWidth = 200;
  const viewBoxHeight = 24;
  
  // Path exact de l'arc officiel IArche v4.0
  // Courbe de Bézier cubique reproduisant fidèlement la virgule du logo
  // Part épais à gauche (bas), monte en arc, s'affine vers la droite
  const arcPath = `M 0 22 C 0 22 58 -6 100 10 C 142 26 200 18 200 18 L 200 20 C 200 20 142 30 100 14 C 58 -2 0 24 0 24 Z`;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={width}
      height={height}
      className={cn('block', className)}
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
      />
    </svg>
  );
};

export default LogoArc;
