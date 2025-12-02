import React from 'react';
import { IARCHE_COLORS, IARCHE_GRADIENTS, IARCHE_FONTS, LogoSize, ThemeType } from './tokens';

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

/**
 * Logo IArche avec gradient CSS
 * - Theme dark: texte blanc fixe (sur fond bleu nuit)
 * - Theme light: texte avec gradient animé
 */
export const HTMLLogo: React.FC<HTMLLogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const fontSize = FONT_SIZES[size];
  
  const baseStyle: React.CSSProperties = {
    fontFamily: IARCHE_FONTS.primary,
    fontSize: `${fontSize}px`,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    margin: 0,
    padding: 0,
  };

  if (theme === 'dark') {
    // Sur fond bleu nuit: logo terracotta
    return (
      <span
        className={className}
        style={{
          ...baseStyle,
          color: IARCHE_COLORS.terracotta,
        }}
      >
        IArche
      </span>
    );
  }

  // Sur fond clair: gradient text
  return (
    <span
      className={className}
      style={{
        ...baseStyle,
        background: IARCHE_GRADIENTS.text,
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      }}
    >
      IArche
    </span>
  );
};

export default HTMLLogo;
