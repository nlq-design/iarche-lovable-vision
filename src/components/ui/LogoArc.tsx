import React from 'react';
import { cn } from '@/lib/utils';
import arcImage from '@/assets/arc-iarche-v4.png';

interface LogoArcProps {
  /** Taille de l'arc */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Arc décoratif IArche v4.0 - Image PNG officielle
 * 
 * Utilise directement le fichier PNG de référence fourni
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

  return (
    <img
      src={arcImage}
      alt=""
      aria-hidden="true"
      className={cn('block object-contain', className)}
      style={{ width, height }}
      draggable={false}
    />
  );
};

export default LogoArc;
