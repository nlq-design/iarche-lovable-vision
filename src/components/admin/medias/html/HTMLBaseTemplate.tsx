import React, { forwardRef } from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType } from './tokens';
import { HTMLMeshBackground } from './HTMLMeshBackground';
import { HTMLArches } from './HTMLArches';
import { HTMLCanalisationLines } from './HTMLCanalisationLines';

interface HTMLBaseTemplateProps {
  width: number;
  height: number;
  theme?: ThemeType;
  showMesh?: boolean;
  showArches?: boolean;
  showCanalisations?: boolean;
  archSize?: number;
  canalisationOpacity?: number;
  canalisationStrokeWidth?: number;
  padding?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Template de base pour tous les visuels HTML/PNG
 * Inclut: fond, maillé, arches/canalisations décoratives
 */
export const HTMLBaseTemplate = forwardRef<HTMLDivElement, HTMLBaseTemplateProps>(
  (
    {
      width,
      height,
      theme = 'light',
      showMesh = true,
      showArches = true,
      showCanalisations = false,
      archSize,
      canalisationOpacity = 0.5,
      canalisationStrokeWidth = 7,
      padding = 40,
      children,
      className = '',
    },
    ref
  ) => {
    const backgroundColor = theme === 'dark' 
      ? IARCHE_COLORS.bleuNuit 
      : IARCHE_COLORS.blancCasse;

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
        {/* Mesh background pattern */}
        {showMesh && <HTMLMeshBackground theme={theme} />}
        
        {/* Full canalisation lines (hero-style) */}
        {showCanalisations && (
          <HTMLCanalisationLines
            width={width}
            height={height}
            theme={theme}
            opacity={canalisationOpacity}
            strokeWidth={canalisationStrokeWidth}
          />
        )}
        
        {/* Decorative arches in corners (simpler alternative) */}
        {showArches && !showCanalisations && (
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
