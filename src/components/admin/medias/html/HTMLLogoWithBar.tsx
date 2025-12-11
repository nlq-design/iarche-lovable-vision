import React from 'react';
import { IARCHE_COLORS, IARCHE_GRADIENTS, IARCHE_FONTS, IARCHE_SIZES, LogoSize, ThemeType, BarSize } from './tokens';

interface HTMLLogoWithBarProps {
  size?: LogoSize;
  theme?: ThemeType;
  className?: string;
  /** Taille de la barre proportionnelle au logo par défaut */
  barSize?: BarSize;
}

/**
 * Logo IArche avec barre décorative obligatoire
 * Selon la charte graphique 3.1, le logo doit TOUJOURS être accompagné de sa barre
 * 
 * Proportions par défaut:
 * - sm (24px) → bar sm (48x2)
 * - md (32px) → bar md (80x4)
 * - lg (48px) → bar lg (96x4)
 * - xl (64px) → bar xl (128x6)
 */
export const HTMLLogoWithBar: React.FC<HTMLLogoWithBarProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  barSize,
}) => {
  const fontSize = IARCHE_SIZES.logo[size];
  
  // Barre proportionnelle par défaut
  const effectiveBarSize: BarSize = barSize || size;
  const barDimensions = IARCHE_SIZES.bar[effectiveBarSize];
  
  // Espacement entre logo et barre proportionnel à la taille
  const gap = size === 'sm' ? 8 : size === 'md' ? 12 : size === 'lg' ? 16 : 20;

  const logoStyle: React.CSSProperties = {
    fontFamily: IARCHE_FONTS.primary,
    fontSize: `${fontSize}px`,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    margin: 0,
    padding: 0,
  };

  const barStyle: React.CSSProperties = {
    width: `${barDimensions.width}px`,
    height: `${barDimensions.height}px`,
    background: IARCHE_GRADIENTS.bar,
    borderRadius: `${barDimensions.height / 2}px`,
    flexShrink: 0,
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${gap}px`,
  };

  // Sur fond sombre (dark): logo en Terracotta
  if (theme === 'dark') {
    return (
      <div className={className} style={containerStyle}>
        <span
          style={{
            ...logoStyle,
            color: IARCHE_COLORS.terracotta,
          }}
        >
          IArche
        </span>
        <div style={barStyle} />
      </div>
    );
  }

  // Sur fond clair (light): logo avec gradient animé
  return (
    <div className={className} style={containerStyle}>
      <span
        style={{
          ...logoStyle,
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
      <div style={barStyle} />
    </div>
  );
};

export default HTMLLogoWithBar;
