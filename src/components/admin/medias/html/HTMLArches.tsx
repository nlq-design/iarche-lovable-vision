import React from 'react';
import { IARCHE_COLORS, ThemeType } from './tokens';

type ArchPosition = 'top-right' | 'bottom-left' | 'both';

interface HTMLArchesProps {
  position?: ArchPosition;
  theme?: ThemeType;
  size?: number;
  strokeWidth?: number;
  opacity?: number;
  className?: string;
}

/**
 * Arches décoratives dans les coins
 * Reproduction des lignes canalisation du hero section
 */
export const HTMLArches: React.FC<HTMLArchesProps> = ({
  position = 'both',
  theme = 'light',
  size = 120,
  strokeWidth = 3,
  opacity = 0.4,
  className = '',
}) => {
  const strokeColor = theme === 'dark' 
    ? IARCHE_COLORS.terracotta 
    : IARCHE_COLORS.bleuNuit;

  const renderArch = (pos: 'top-right' | 'bottom-left') => {
    const isTopRight = pos === 'top-right';
    
    // Path for L-shaped arch with rounded corner
    const path = isTopRight
      ? `M ${size} 0 L ${size * 0.3} 0 Q 0 0 0 ${size * 0.3} L 0 ${size}`
      : `M 0 ${size} L 0 ${size * 0.7} Q 0 ${size} ${size * 0.3} ${size} L ${size} ${size}`;

    return (
      <svg
        key={pos}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          position: 'absolute',
          ...(isTopRight ? { top: 0, right: 0 } : { bottom: 0, left: 0 }),
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient
            id={`arch-gradient-${pos}-${theme}`}
            x1={isTopRight ? '100%' : '0%'}
            y1="0%"
            x2={isTopRight ? '0%' : '100%'}
            y2="100%"
          >
            <stop offset="0%" stopColor={IARCHE_COLORS.bleuNuit} />
            <stop offset="100%" stopColor={IARCHE_COLORS.terracotta} />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke={theme === 'dark' ? strokeColor : `url(#arch-gradient-${pos}-${theme})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      </svg>
    );
  };

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {(position === 'top-right' || position === 'both') && renderArch('top-right')}
      {(position === 'bottom-left' || position === 'both') && renderArch('bottom-left')}
    </div>
  );
};

export default HTMLArches;
