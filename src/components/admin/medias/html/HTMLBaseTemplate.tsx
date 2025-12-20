import React, { forwardRef } from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType, getBackgroundColor } from './tokens';
import { HTMLArches } from './HTMLArches';

type ArcPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface DecorativeArcConfig {
  position: ArcPosition;
  size?: number; // en pixels, défaut 80
  opacity?: number; // défaut 0.05
  strokeWidth?: number; // défaut 1.5
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

    // v4.2: Configuration de l'arc décoratif
    const arcConfig: DecorativeArcConfig | null = decorativeArc
      ? typeof decorativeArc === 'boolean'
        ? { position: 'bottom-right', size: 80, opacity: 0.05, strokeWidth: 1.5 }
        : { 
            position: decorativeArc.position, 
            size: decorativeArc.size ?? 80, 
            opacity: decorativeArc.opacity ?? 0.05,
            strokeWidth: decorativeArc.strokeWidth ?? 1.5,
          }
      : null;

    // Couleur de l'arc selon le thème
    const isDark = theme === 'dark' || theme === 'terra' || theme === 'contrast';
    const arcColor = isDark ? '#ffffff' : IARCHE_COLORS.terracotta;

    // Position de l'arc - reste DANS le conteneur (pas de décalage négatif)
    const getArcStyle = (pos: ArcPosition, size: number): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 0,
      };
      
      switch (pos) {
        case 'top-right':
          return { ...baseStyle, top: 0, right: 0 };
        case 'top-left':
          return { ...baseStyle, top: 0, left: 0 };
        case 'bottom-right':
          return { ...baseStyle, bottom: 0, right: 0 };
        case 'bottom-left':
          return { ...baseStyle, bottom: 0, left: 0 };
      }
    };

    // SVG path selon la position
    const getArcPath = (pos: ArcPosition, size: number): string => {
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
        {/* v4.2 - Arc décoratif subtil en zone morte (INCLUS dans l'export) */}
        {arcConfig && (
          <div 
            style={{ 
              ...getArcStyle(arcConfig.position, arcConfig.size!), 
              opacity: arcConfig.opacity,
            }}
            data-decorative-arc="true"
          >
            <svg 
              viewBox={`0 0 ${arcConfig.size} ${arcConfig.size}`} 
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
