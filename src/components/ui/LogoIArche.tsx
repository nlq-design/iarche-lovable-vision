import React from 'react';

interface LogoIArcheProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBar?: boolean;
  className?: string;
}

/**
 * Logo IArche avec barre gradient proportionnelle
 * Tailles : sm (24px), md (30px), lg (48px), xl (72px)
 */
const LogoIArche: React.FC<LogoIArcheProps> = ({ 
  size = 'md', 
  showBar = true,
  className = '' 
}) => {
  const sizeConfig = {
    sm: {
      text: 'text-2xl',
      barWidth: 'w-12',
      barHeight: 'h-0.5',
      gap: 'mt-1'
    },
    md: {
      text: 'text-3xl',
      barWidth: 'w-16',
      barHeight: 'h-0.5',
      gap: 'mt-1.5'
    },
    lg: {
      text: 'text-5xl md:text-6xl',
      barWidth: 'w-16 md:w-20',
      barHeight: 'h-0.5 md:h-1',
      gap: 'mt-2'
    },
    xl: {
      text: 'text-5xl md:text-6xl lg:text-7xl',
      barWidth: 'w-16 md:w-20 lg:w-24',
      barHeight: 'h-0.5 md:h-1',
      gap: 'mt-2 md:mt-3'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <span className={`${config.text} font-semibold hero-gradient-text`}>
        IArche
      </span>
      {showBar && (
        <div 
          className={`${config.barWidth} ${config.barHeight} ${config.gap} rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default LogoIArche;
