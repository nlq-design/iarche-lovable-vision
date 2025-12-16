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
    sm: { width: 100, height: 6 },
    md: { width: 160, height: 10 },
    lg: { width: 240, height: 15 },
    xl: { width: 360, height: 22 },
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
