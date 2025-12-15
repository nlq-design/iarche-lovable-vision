import React from 'react';
import { LogoSize, ThemeType } from './tokens';

interface HTMLLogoProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
}

const FONT_SIZES: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

const LOGO_HEIGHTS: Record<LogoSize, number> = {
  sm: 24,
  md: 40,
  lg: 56,
  xl: 80,
};

/**
 * Logo IArche v4.0
 * 
 * Par défaut, utilise le nouveau logo SVG avec arc
 * Option fallback: texte gradient animé (legacy)
 * 
 * - Theme dark: logo blanc (sur fond bleu nuit)
 * - Theme light: logo gradient (fond clair)
 */
export const HTMLLogo: React.FC<HTMLLogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const height = LOGO_HEIGHTS[size];

  // v4.0: Toujours utiliser le logo SVG officiel
  const logoSrc = theme === 'dark' 
    ? '/logos/iarche-white.svg' 
    : '/logos/iarche-main.svg';
  
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
