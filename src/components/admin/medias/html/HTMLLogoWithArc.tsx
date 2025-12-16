import React from 'react';
import { LogoSize, ThemeType } from './tokens';

interface HTMLLogoWithArcProps {
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
 * Logo IArche v4.0 (sans arc)
 * 
 * v4.0: L'arc ne doit JAMAIS être placé sous le logo
 * L'arc est réservé aux titres de sections uniquement
 * 
 * @see HTMLLogoArc pour l'arc décoratif (à utiliser sous les titres)
 */
export const HTMLLogoWithArc: React.FC<HTMLLogoWithArcProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const logoSrc = theme === 'dark' 
    ? '/logos/iarche-white.svg' 
    : '/logos/iarche-main.svg';

  const height = LOGO_HEIGHTS[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img
        src={logoSrc}
        alt="IArche"
        style={{ height }}
        draggable={false}
      />
      {/* v4.0: Arc JAMAIS sous le logo */}
    </div>
  );
};

export default HTMLLogoWithArc;
