import React, { forwardRef } from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType, getBackgroundColor } from './tokens';
import { HTMLArches } from './HTMLArches';

interface HTMLBaseTemplateProps {
  width: number;
  height: number;
  theme?: ThemeType;
  showArches?: boolean;
  archSize?: number;
  padding?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Template de base pour tous les visuels HTML/PNG
 * Inclut: fond, arches décoratives
 * 
 * v4.0: Suppression des canalisations et fond quadrillé
 * v4.1: Support des 4 thèmes (dark, light, terra, contrast)
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
    },
    ref
  ) => {
    // v4.1: Utiliser getBackgroundColor pour tous les thèmes
    const backgroundColor = getBackgroundColor(theme);

    // Auto-calculate arch size based on smallest dimension
    const calculatedArchSize = archSize ?? Math.min(width, height) * 0.15;

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

export default HTMLBaseTemplate;
