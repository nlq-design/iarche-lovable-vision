import React, { forwardRef } from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType, getBackgroundColor } from './tokens';
import { HTMLArches } from './HTMLArches';

type ArcPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface DecorativeArcConfig {
  position: ArcPosition;
  size?: number; // en pixels, défaut 80
  opacity?: number; // défaut 0.05
  strokeWidth?: number; // défaut 1.5
  /** v4.3 - Mode continuité: l'arc est plus grand et déborde du cadre */
  extended?: boolean; // défaut true
}

interface HTMLBaseTemplateProps {
  width: number;
  height: number;
  theme?: ThemeType;
  showArches?: boolean;
  archSize?: number;
  padding?: number;
  children: React.ReactNode;
  className?: string;
  /** v4.2 - Arc décoratif subtil en zone morte (inclus dans l'export) */
  decorativeArc?: DecorativeArcConfig | boolean;
}

/**
 * Template de base pour tous les visuels HTML/PNG
 * Inclut: fond, arches décoratives
 * 
 * v4.0: Suppression des canalisations et fond quadrillé
 * v4.1: Support des 4 thèmes (dark, light, terra, contrast)
 * v4.2: Arc décoratif subtil en zone morte (prop decorativeArc)
 * v4.3: Mode continuité - l'arc déborde du cadre pour un effet professionnel
 */
export const HTMLBaseTemplate = forwardRef<HTMLDivElement, HTMLBaseTemplateProps>(
  (
    {
      width,
      height,
      theme = 'light',
      showArches = true,
      archSize,
      padding = 40,
      children,
      className = '',
      decorativeArc,
    },
    ref
  ) => {
    // v4.1: Utiliser getBackgroundColor pour tous les thèmes
    const backgroundColor = getBackgroundColor(theme);

    // Auto-calculate arch size based on smallest dimension
    const calculatedArchSize = archSize ?? Math.min(width, height) * 0.15;

    // v4.3: Configuration de l'arc décoratif avec mode continuité par défaut
    const arcConfig: (DecorativeArcConfig & { extended: boolean }) | null = decorativeArc
      ? typeof decorativeArc === 'boolean'
        ? { position: 'bottom-right', size: 80, opacity: 0.05, strokeWidth: 1.5, extended: true }
        : { 
            position: decorativeArc.position, 
            size: decorativeArc.size ?? 80, 
            opacity: decorativeArc.opacity ?? 0.05,
            strokeWidth: decorativeArc.strokeWidth ?? 1.5,
            extended: decorativeArc.extended !== false, // par défaut true
          }
      : null;

    // Couleur de l'arc selon le thème
    const isDark = theme === 'dark' || theme === 'terra' || theme === 'contrast';
    const arcColor = isDark ? '#ffffff' : IARCHE_COLORS.terracotta;

    // v4.3 - Mode continuité: multiplicateur de taille et offset négatif
    const getExtendedSize = (baseSize: number): number => {
      return arcConfig?.extended ? baseSize * 1.8 : baseSize;
    };
    
    const getExtendedOffset = (size: number): number => {
      // L'arc déborde de 40% de sa taille hors du cadre
      return arcConfig?.extended ? -size * 0.4 : 0;
    };

    // Position de l'arc - v4.3 avec support mode continuité
    const getArcStyle = (pos: ArcPosition, baseSize: number): React.CSSProperties => {
      const size = getExtendedSize(baseSize);
      const offset = getExtendedOffset(size);
      
      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 0,
      };
      
      switch (pos) {
        case 'top-right':
          return { ...baseStyle, top: offset, right: offset };
        case 'top-left':
          return { ...baseStyle, top: offset, left: offset };
        case 'bottom-right':
          return { ...baseStyle, bottom: offset, right: offset };
        case 'bottom-left':
          return { ...baseStyle, bottom: offset, left: offset };
      }
    };

    // SVG path selon la position - v4.3 adapté pour mode continuité
    const getArcPath = (pos: ArcPosition, baseSize: number): string => {
      const size = getExtendedSize(baseSize);
      switch (pos) {
        case 'top-right':
        case 'bottom-left':
          return `M${size} 0 Q${size} ${size} 0 ${size}`;
        case 'top-left':
        case 'bottom-right':
          return `M0 0 Q0 ${size} ${size} ${size}`;
      }
    };

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: IARCHE_FONTS.primary,
        }}
      >
        {/* v4.3 - Arc décoratif avec mode continuité (déborde du cadre) */}
        {arcConfig && (
          <div 
            style={{ 
              ...getArcStyle(arcConfig.position, arcConfig.size!), 
              opacity: arcConfig.opacity,
            }}
            data-decorative-arc="true"
            data-extended={arcConfig.extended}
          >
            <svg 
              viewBox={`0 0 ${getExtendedSize(arcConfig.size!)} ${getExtendedSize(arcConfig.size!)}`} 
              style={{ width: '100%', height: '100%' }}
            >
              <path 
                d={getArcPath(arcConfig.position, arcConfig.size!)} 
                fill="none" 
                stroke={arcColor} 
                strokeWidth={arcConfig.strokeWidth}
              />
            </svg>
          </div>
        )}

        {/* Decorative arches in corners */}
        {showArches && (
          <HTMLArches 
            position="both" 
            theme={theme} 
            size={calculatedArchSize}
          />
        )}
        
        {/* Content wrapper with padding */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: `${padding}px`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

HTMLBaseTemplate.displayName = 'HTMLBaseTemplate';
