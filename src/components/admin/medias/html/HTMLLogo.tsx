import React from 'react';
import { LogoSize, ThemeType } from './tokens';

interface HTMLLogoProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
}

const LOGO_HEIGHTS: Record<LogoSize, number> = {
  sm: 24,
  md: 40,
  lg: 56,
  xl: 80,
};

/**
 * Logo IArche v4.0
 * 
 * Utilise les logos SVG officiels
 * v4.1: Support des 4 thèmes (dark, light, terra, contrast)
 * 
 * - Theme dark/terra/contrast: logo blanc (sur fond sombre)
 * - Theme light: logo gradient (fond clair)
 */
export const HTMLLogo: React.FC<HTMLLogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const height = LOGO_HEIGHTS[size];

  // v4.1: Logo blanc pour tous les thèmes sombres (dark, terra, contrast)
  const logoSrc = theme === 'light' 
    ? '/logos/iarche-main.svg'
    : '/logos/iarche-white.svg';
  
  return (
    <img
      src={logoSrc}
      alt="IArche"
      className={className}
      style={{ height, display: 'inline-block' }}
      draggable={false}
    />
  );

};

export default HTMLLogo;
