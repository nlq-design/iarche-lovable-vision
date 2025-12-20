import React from 'react';
import { IARCHE_COLORS } from './tokens';

interface HTMLLogoDiscretProps {
  theme?: 'dark' | 'light' | 'terra' | 'contrast';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'xs' | 'sm' | 'md';
}

const SIZES = {
  xs: 60,
  sm: 80,
  md: 100,
};

/**
 * Logo IArche discret - petit logo en coin SANS arc décoratif
 * Idéal pour bannières LinkedIn (évite redondance avec photo de profil)
 */
export const HTMLLogoDiscret: React.FC<HTMLLogoDiscretProps> = ({
  theme = 'dark',
  position = 'bottom-right',
  size = 'sm',
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isTerra = theme === 'terra';
  
  // Choisir le bon logo selon le thème
  const logoSrc = isDark || isTerra 
    ? 'https://iarche.fr/logos/iarche-white.svg'
    : 'https://iarche.fr/logos/iarche-dark.svg';

  const logoWidth = SIZES[size];

  const positionStyles: React.CSSProperties = {
    position: 'absolute',
    ...(position.includes('bottom') ? { bottom: '20px' } : { top: '20px' }),
    ...(position.includes('right') ? { right: '24px' } : { left: '24px' }),
  };

  return (
    <div style={{
      ...positionStyles,
      display: 'flex',
      alignItems: 'center',
      opacity: 0.9,
    }}>
      <img 
        src={logoSrc} 
        alt="IArche" 
        style={{
          width: `${logoWidth}px`,
          height: 'auto',
        }}
      />
    </div>
  );
};

export default HTMLLogoDiscret;
