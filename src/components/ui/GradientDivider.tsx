import { memo } from 'react';
import Logo from './Logo';

interface GradientDividerProps {
  className?: string;
  showLogo?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

/**
 * Séparateur gradient horizontal avec logo IArche en filigrane
 * Utilise le gradient de marque IArche (navy → terracotta)
 */
const GradientDivider = memo(({ 
  className = '', 
  showLogo = true,
  height = 'md'
}: GradientDividerProps) => {
  const heightClasses = {
    sm: 'h-16',
    md: 'h-24',
    lg: 'h-32'
  };

  return (
    <div 
      className={`relative w-full overflow-hidden ${heightClasses[height]} ${className}`}
      style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' }}
    >
      {showLogo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Logo variant="white" size="lg" />
        </div>
      )}
    </div>
  );
});

GradientDivider.displayName = 'GradientDivider';

export default GradientDivider;
