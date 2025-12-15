import React from 'react';
import { IARCHE_SIZES, LogoSize, ThemeType, BarSize } from './tokens';
import { HTMLLogoArc } from './HTMLLogoArc';

interface HTMLLogoWithBarProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
  /** Taille de la barre (arc) proportionnelle au logo par défaut */
  barSize?: BarSize;
}

const LOGO_HEIGHTS: Record<LogoSize, number> = {
  sm: 24,
  md: 40,
  lg: 56,
  xl: 80,
};

/**
 * Logo IArche v4.0 avec arc décoratif
 * 
 * Utilise le logo SVG officiel + arc décoratif
 * Conforme à la charte graphique 4.0
 */
export const HTMLLogoWithBar: React.FC<HTMLLogoWithBarProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  barSize,
}) => {
  const height = LOGO_HEIGHTS[size];
  const effectiveBarSize = barSize || size;
  
  // Espacement entre logo et arc proportionnel à la taille
  const gap = size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 20;

  // Logo SVG selon le thème
  const logoSrc = theme === 'dark' 
    ? '/logos/iarche-white.svg' 
    : '/logos/iarche-main.svg';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${gap}px`,
  };

  return (
    <div className={className} style={containerStyle}>
      <img
        src={logoSrc}
        alt="IArche"
        style={{ height, display: 'inline-block' }}
        draggable={false}
      />
      <HTMLLogoArc size={effectiveBarSize} />
    </div>
  );
};

export default HTMLLogoWithBar;
