import React from 'react';
import { cn } from '@/lib/utils';

interface GradientTitleProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span';
  centered?: boolean;
}

/**
 * Titre avec gradient IArche et barre décorative proportionnelle
 * 
 * Tailles :
 * - sm : Cards (text-base/lg) - barre w-12 h-0.5
 * - md : Slugs (text-2xl/3xl) - barre w-20 h-1
 * - lg : Pages (text-3xl/5xl) - barre w-24 h-1
 * - xl : Hero (text-5xl/7xl) - barre w-32 h-1.5
 */
const GradientTitle: React.FC<GradientTitleProps> = ({
  children,
  size = 'lg',
  className = '',
  as: Component = 'h1',
  centered = true
}) => {
  const sizeConfig = {
    sm: {
      text: 'text-base md:text-lg font-semibold',
      bar: 'w-12 h-0.5 mt-1',
    },
    md: {
      text: 'text-2xl md:text-3xl font-bold',
      bar: 'w-20 h-1 mt-2',
    },
    lg: {
      text: 'text-3xl md:text-5xl font-bold',
      bar: 'w-24 h-1 mt-2',
    },
    xl: {
      text: 'text-5xl md:text-6xl lg:text-7xl font-semibold',
      bar: 'w-32 h-1.5 mt-2',
    },
  };

  const config = sizeConfig[size];
  const centerClasses = centered ? 'text-center mx-auto' : '';

  return (
    <div className={cn('flex flex-col', centered && 'items-center', className)}>
      <Component className={cn('hero-gradient-text', config.text)}>
        {children}
      </Component>
      <div 
        className={cn(
          'rounded-full bg-gradient-to-r from-primary via-accent to-primary',
          config.bar,
          centerClasses
        )} 
        aria-hidden="true"
      />
    </div>
  );
};

export default GradientTitle;
