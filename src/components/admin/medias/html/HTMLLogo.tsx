import React from 'react';
import { IARCHE_COLORS, IARCHE_GRADIENTS, IARCHE_FONTS, LogoSize, ThemeType } from './tokens';

interface HTMLLogoProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
  /** v4.0: Utiliser l'image SVG du nouveau logo */
  useSvgImage?: boolean;
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
  useSvgImage = true,
}) => {
  const height = LOGO_HEIGHTS[size];

  // v4.0: Utiliser l'image SVG
  if (useSvgImage) {
    const logoSrc = theme === 'dark' 
      ? '/logos/iarche-white.svg' 
      : '/logos/iarche-main.svg';
    
    return (
      <img
        src={logoSrc}
        alt="IArche"
        className={className}
        style={{ height, display: 'inline-block' }}
      />
    );
  }

  // Legacy: Texte gradient
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
