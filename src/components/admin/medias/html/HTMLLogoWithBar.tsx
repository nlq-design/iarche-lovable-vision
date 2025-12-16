import React from 'react';
import { LogoSize, ThemeType, BarSize } from './tokens';

interface HTMLLogoWithBarProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
  /** @deprecated v4.0 - Arc n'est plus affiché sous le logo */
  barSize?: BarSize;
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
 * @deprecated Utiliser HTMLLogo directement
 * v4.0: L'arc ne doit JAMAIS être placé sous le logo
 * L'arc est réservé aux titres de sections uniquement
 */
export const HTMLLogoWithBar: React.FC<HTMLLogoWithBarProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const height = LOGO_HEIGHTS[size];

  // Logo SVG selon le thème
  const logoSrc = theme === 'dark' 
    ? '/logos/iarche-white.svg' 
    : '/logos/iarche-main.svg';

  return (
    <div className={className}>
      <img
        src={logoSrc}
        alt="IArche"
        style={{ height, display: 'inline-block' }}
        draggable={false}
      />
      {/* v4.0: Arc SUPPRIMÉ - ne jamais placer d'arc sous le logo */}
    </div>
  );
};

export default HTMLLogoWithBar;
