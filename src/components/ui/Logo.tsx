import React from 'react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/contexts/BrandingContext';

interface LogoProps {
  /** Variante du logo */
  variant?: 'main' | 'white' | 'dark';
  /** Taille du logo */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher uniquement l'icône (arc) */
  iconOnly?: boolean;
  /** Priorité haute pour LCP (ajoute fetchpriority="high") */
  priority?: boolean;
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
  priority = false,
}) => {
  // Dimensions basées sur le ratio réel du SVG (environ 3.23:1)
  const sizeConfig = {
    sm: { height: 24, width: 78, iconSize: 20 },
    md: { height: 40, width: 129, iconSize: 32 },
    lg: { height: 56, width: 181, iconSize: 48 },
    xl: { height: 80, width: 258, iconSize: 64 },
  };

  const { height, width, iconSize } = sizeConfig[size];

  // White-label : logo du locataire si actif, sinon logos IArche (défaut)
  const { branding, isWhiteLabel } = useBranding();
  const tenant = isWhiteLabel ? branding : null;
  const altText = tenant?.brand_name ?? 'IArche · Architecte IA Bayonne';

  // Si iconOnly, utiliser l'icône SVG
  if (iconOnly) {
    return (
      <img
        src={tenant?.logo_url ?? '/logos/iarche-icon-512.svg'}
        alt={tenant?.brand_name ?? 'IArche'}
        className={cn('inline-block', className)}
        style={{ height: iconSize, width: iconSize }}
      />
    );
  }

  // Variantes du logo complet
  const logoSrc = tenant
    ? {
        main: tenant.logo_url ?? '/logos/iarche-main.svg',
        white: tenant.logo_dark_url ?? tenant.logo_url ?? '/logos/iarche-white.svg',
        dark: tenant.logo_url ?? '/logos/iarche-dark.svg',
      }
    : {
        main: '/logos/iarche-main.svg',
        white: '/logos/iarche-white.svg',
        dark: '/logos/iarche-dark.svg',
      };

  return (
    <img
      src={logoSrc[variant]}
      alt={altText}
      className={cn('inline-block', className)}
      width={width}
      height={height}
      style={{ height }}
      loading={priority ? 'eager' : undefined}
      decoding={priority ? 'sync' : 'async'}
    />
  );
};

export default Logo;
