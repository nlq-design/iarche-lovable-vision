import React from 'react';
import { IARCHE_COLORS, ThemeType } from './tokens';

interface HTMLMeshBackgroundProps {
  theme?: ThemeType;
  opacity?: number;
  className?: string;
}

/**
 * Fond maillé diagonal 45°/-45°
 * Pattern de lignes fines croisées
 */
export const HTMLMeshBackground: React.FC<HTMLMeshBackgroundProps> = ({
  theme = 'light',
  opacity = 0.03,
  className = '',
}) => {
  const lineColor = theme === 'dark' 
    ? IARCHE_COLORS.white 
    : IARCHE_COLORS.bleuNuit;

  // SVG pattern for diagonal mesh
  const svgPattern = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <path d="M0 40L40 0M-10 10L10 -10M30 50L50 30" stroke="${lineColor}" stroke-width="0.5" opacity="${opacity}" fill="none"/>
      <path d="M40 40L0 0M50 10L30 -10M10 50L-10 30" stroke="${lineColor}" stroke-width="0.5" opacity="${opacity}" fill="none"/>
    </svg>
  `.replace(/\n\s*/g, '');

  const encodedSvg = encodeURIComponent(svgPattern);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
        backgroundRepeat: 'repeat',
        pointerEvents: 'none',
      }}
    />
  );
};

export default HTMLMeshBackground;
