import React from 'react';
import arcImage from '@/assets/arc-iarche-v4.png';

type ArcSize = 'sm' | 'md' | 'lg' | 'xl';

interface HTMLLogoArcProps {
  size?: ArcSize;
  className?: string;
}

/**
 * Arc décoratif IArche pour HTML - Version v4.0
 * 
 * Utilise directement le fichier PNG de référence fourni
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

  return (
    <img
      src={arcImage}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ 
        width, 
        height, 
        display: 'block',
        objectFit: 'contain',
      }}
      draggable={false}
    />
  );
};

export default HTMLLogoArc;
