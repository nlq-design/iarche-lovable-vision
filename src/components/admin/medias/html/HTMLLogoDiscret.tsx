import React from 'react';
import { IARCHE_COLORS, IARCHE_FONTS } from './tokens';

interface HTMLLogoDiscretProps {
  theme?: 'dark' | 'light' | 'terra' | 'contrast';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'xs' | 'sm' | 'md';
}

const SIZES = {
  xs: { logo: 80, text: 12, gap: 6 },
  sm: { logo: 100, text: 14, gap: 8 },
  md: { logo: 120, text: 16, gap: 10 },
};

export const HTMLLogoDiscret: React.FC<HTMLLogoDiscretProps> = ({
  theme = 'dark',
  position = 'bottom-right',
  size = 'sm',
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isTerra = theme === 'terra';
  
  const textColor = isDark ? IARCHE_COLORS.white : isTerra ? IARCHE_COLORS.white : IARCHE_COLORS.bleuNuit;
  const { logo: logoWidth, text: fontSize } = SIZES[size];

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
      gap: SIZES[size].gap,
      opacity: 0.85,
    }}>
      {/* Simple text logo - very discrete */}
      <span style={{
        fontFamily: IARCHE_FONTS.primary,
        fontSize: `${fontSize}px`,
        fontWeight: 600,
        color: textColor,
        letterSpacing: '0.05em',
      }}>
        IArche
      </span>
      <span style={{
        fontFamily: IARCHE_FONTS.primary,
        fontSize: `${fontSize * 0.9}px`,
        fontWeight: 400,
        color: textColor,
        opacity: 0.7,
      }}>
        iarche.fr
      </span>
    </div>
  );
};

export default HTMLLogoDiscret;
