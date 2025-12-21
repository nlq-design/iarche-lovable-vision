import React from 'react';
import { IARCHE_COLORS, IARCHE_FONTS } from './tokens';

interface HTMLHeaderGradientProps {
  /** Titre affiché dans le header */
  title?: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Afficher le logo IArche */
  showLogo?: boolean;
  /** Hauteur du header en pixels */
  height?: number;
  /** Largeur du header en pixels (100% si non spécifié) */
  width?: number | string;
  /** Coins arrondis (par défaut: 12px en haut) */
  borderRadius?: string;
  /** Direction du gradient (défaut: 135deg diagonal) */
  gradientAngle?: number;
  /** Inverser les couleurs du gradient */
  reverse?: boolean;
  /** Padding vertical */
  paddingY?: number;
  /** Padding horizontal */
  paddingX?: number;
  /** Taille du titre */
  titleSize?: number;
  /** Taille du sous-titre */
  subtitleSize?: number;
  /** Taille du logo */
  logoHeight?: number;
  /** Contenu personnalisé (remplace titre/subtitle) */
  children?: React.ReactNode;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * HTMLHeaderGradient v4.2
 * 
 * Reproduit exactement le style du header email IArche:
 * - Gradient diagonal 135° (Bleu Nuit → Terracotta)
 * - Logo centré au-dessus du titre
 * - Texte blanc
 * - Coins arrondis en haut
 * 
 * Usage pour bannières LinkedIn, headers de posts, etc.
 */
export const HTMLHeaderGradient: React.FC<HTMLHeaderGradientProps> = ({
  title,
  subtitle,
  showLogo = true,
  height,
  width = '100%',
  borderRadius = '12px 12px 0 0',
  gradientAngle = 135,
  reverse = false,
  paddingY = 32,
  paddingX = 40,
  titleSize = 24,
  subtitleSize = 14,
  logoHeight = 40,
  children,
  className = '',
}) => {
  // Gradient colors based on direction
  const startColor = reverse ? IARCHE_COLORS.terracotta : IARCHE_COLORS.bleuNuit;
  const endColor = reverse ? IARCHE_COLORS.bleuNuit : IARCHE_COLORS.terracotta;
  
  const gradientStyle = `linear-gradient(${gradientAngle}deg, ${startColor} 0%, ${endColor} 100%)`;

  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: height ? `${height}px` : 'auto',
        background: gradientStyle,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: IARCHE_FONTS.primary,
        boxSizing: 'border-box',
      }}
    >
      {children ? (
        children
      ) : (
        <>
          {/* Logo IArche */}
          {showLogo && (
            <img 
              src="/logos/iarche-white.svg" 
              alt="IArche"
              crossOrigin="anonymous"
              style={{
                height: `${logoHeight}px`,
                marginBottom: subtitle ? '12px' : '16px',
                objectFit: 'contain',
              }}
            />
          )}
          
          {/* Titre principal */}
          {title && (
            <h1
              style={{
                color: IARCHE_COLORS.white,
                margin: 0,
                fontSize: `${titleSize}px`,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h1>
          )}
          
          {/* Sous-titre optionnel */}
          {subtitle && (
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                margin: '8px 0 0 0',
                fontSize: `${subtitleSize}px`,
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default HTMLHeaderGradient;
