import React from 'react';
import { IARCHE_GRADIENTS, IARCHE_SIZES, BarSize } from './tokens';

interface HTMLGradientBarProps {
  size?: BarSize;
  className?: string;
  reverse?: boolean;
}

/**
 * Barre décorative avec gradient IArche
 * Bleu Nuit → Terracotta (ou inversé)
 */
export const HTMLGradientBar: React.FC<HTMLGradientBarProps> = ({
  size = 'md',
  className = '',
  reverse = false,
}) => {
  const dimensions = IARCHE_SIZES.bar[size];
  
  return (
    <div
      className={className}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        background: reverse ? IARCHE_GRADIENTS.barReverse : IARCHE_GRADIENTS.bar,
        borderRadius: `${dimensions.height / 2}px`,
        flexShrink: 0,
      }}
    />
  );
};

export default HTMLGradientBar;
