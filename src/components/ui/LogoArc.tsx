import React from 'react';
import { cn } from '@/lib/utils';

interface LogoArcProps {
  /** Taille de l'arc */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Arc décoratif IArche v4.0 - SVG officiel
 * 
 * Utilise directement le fichier SVG de référence fourni
 * Remplace toutes les barres gradient horizontales du site
 */
const LogoArc: React.FC<LogoArcProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeConfig = {
    sm: { width: 100, height: 30 },
    md: { width: 160, height: 49 },
    lg: { width: 240, height: 73 },
    xl: { width: 360, height: 110 },
  };

  const { width, height } = sizeConfig[size];

  return (
    <img
      src="/logos/iarche-arc.svg"
      alt=""
      aria-hidden="true"
      className={cn('block object-contain', className)}
      style={{ width, height }}
      draggable={false}
    />
  );
};

export default LogoArc;
