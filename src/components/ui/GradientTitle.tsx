import React from 'react';
import { cn } from '@/lib/utils';
import LogoArc from './LogoArc';

interface GradientTitleProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  textClassName?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span';
  centered?: boolean;
  /** Afficher l'arc décoratif sous le titre */
  showArc?: boolean;
}

/**
 * Titre avec gradient IArche et arc décoratif (v4.0)
 * 
 * L'arc remplace l'ancienne barre gradient horizontale
 * 
 * Tailles :
 * - sm : Cards (text-base/lg) - arc sm
 * - md : Slugs (text-2xl/3xl) - arc md
 * - lg : Pages (text-3xl/5xl) - arc lg
 * - xl : Hero (text-5xl/7xl) - arc xl
 */
const GradientTitle: React.FC<GradientTitleProps> = ({
  children,
  size = 'lg',
  className = '',
  textClassName = '',
  as: Component = 'h1',
  centered = true,
  showArc = true,
}) => {
  const sizeConfig = {
    sm: {
      text: 'text-base md:text-lg font-semibold',
      arcSize: 'md' as const,
      gap: 'mt-2',
    },
    md: {
      text: 'text-2xl md:text-3xl font-bold',
      arcSize: 'lg' as const,
      gap: 'mt-3',
    },
    lg: {
      text: 'text-3xl md:text-5xl font-bold',
      arcSize: 'xl' as const,
      gap: 'mt-4',
    },
    xl: {
      text: 'text-5xl md:text-6xl lg:text-7xl font-semibold',
      arcSize: 'xl' as const,
      gap: 'mt-5',
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex flex-col', centered && 'items-center', className)}>
      <Component className={cn('hero-gradient-text', config.text, textClassName)}>
        {children}
      </Component>
      {showArc && (
        <LogoArc 
          size={config.arcSize} 
          className={config.gap}
        />
      )}
    </div>
  );
};

export default GradientTitle;
