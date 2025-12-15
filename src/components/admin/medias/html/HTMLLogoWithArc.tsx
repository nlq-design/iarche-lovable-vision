import React from 'react';
import { LogoSize, ThemeType } from './tokens';
import LogoArc from '@/components/ui/LogoArc';

interface HTMLLogoWithArcProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
}

/**
 * Logo IArche v4.0 avec arc décoratif
 * 
 * Remplace HTMLLogoWithBar (Charte 3.x)
 * L'arc est positionné au-dessus du texte, conformément au nouveau design
 */
export const HTMLLogoWithArc: React.FC<HTMLLogoWithArcProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const logoSrc = theme === 'dark' 
    ? '/logos/iarche-white.svg' 
    : '/logos/iarche-main.svg';

  const heights: Record<LogoSize, number> = {
    sm: 24,
    md: 40,
    lg: 56,
    xl: 80,
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img
        src={logoSrc}
        alt="IArche"
        style={{ height: heights[size] }}
      />
    </div>
  );
};

export default HTMLLogoWithArc;
