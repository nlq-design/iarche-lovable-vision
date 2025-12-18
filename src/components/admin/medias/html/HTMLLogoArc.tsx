import React from 'react';

type ArcSize = 'sm' | 'md' | 'lg' | 'xl';

interface HTMLLogoArcProps {
  size?: ArcSize;
  className?: string;
}

/**
 * Arc décoratif IArche pour HTML - Version v4.0
 * 
 * Utilise directement le fichier SVG de référence fourni
 * Remplace HTMLGradientBar
 */
export const HTMLLogoArc: React.FC<HTMLLogoArcProps> = ({
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
