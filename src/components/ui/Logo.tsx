import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  /** Variante du logo */
  variant?: 'main' | 'white' | 'dark';
  /** Taille du logo */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher uniquement l'icône (arc) */
  iconOnly?: boolean;
}

/**
 * Logo IArche v4.0
 * 
 * Nouveau design avec arc au-dessus du texte
 * - main: gradient Bleu Nuit → Terracotta (fond clair)
 * - white: blanc (fond sombre)
 * - dark: Bleu Nuit (fond clair, monochrome)
 */
const Logo: React.FC<LogoProps> = ({
  variant = 'main',
  size = 'md',
  className = '',
  iconOnly = false,
}) => {
  const sizeConfig = {
    sm: { height: 24, iconSize: 20 },
    md: { height: 40, iconSize: 32 },
    lg: { height: 56, iconSize: 48 },
    xl: { height: 80, iconSize: 64 },
  };

  const { height, iconSize } = sizeConfig[size];

  // Si iconOnly, utiliser l'icône SVG
  if (iconOnly) {
    return (
      <img
        src="/logos/iarche-icon-512.svg"
        alt="IArche"
        className={cn('inline-block', className)}
        style={{ height: iconSize, width: iconSize }}
      />
    );
  }

  // Variantes du logo complet
  const logoSrc = {
    main: '/logos/iarche-main.svg',
    white: '/logos/iarche-white.svg',
    dark: '/logos/iarche-dark.svg',
  };

  return (
    <img
      src={logoSrc[variant]}
      alt="IArche · Agence IA Bayonne"
      className={cn('inline-block', className)}
      style={{ height }}
    />
  );
};

export default Logo;
