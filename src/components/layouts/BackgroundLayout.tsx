import React, { useEffect, ReactNode } from 'react';
import { useAnimationPause } from '@/hooks/useAnimationPause';

interface BackgroundLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * BackgroundLayout - Composant réutilisable pour le design system IArche
 * 
 * Inclut :
 * - Fond Blanc Cassé (#FAF9F7)
 * - Quadrillages diagonaux animés
 * - Rectangles décoratifs avec animation de pulsation
 * - Toutes les animations keyframes nécessaires
 * 
 * Usage :
 * <BackgroundLayout>
 *   <div>Votre contenu ici</div>
 * </BackgroundLayout>
 */
const BackgroundLayout = ({ children, className = '' }: BackgroundLayoutProps) => {
  const backgroundRef = useAnimationPause<HTMLDivElement>();

  return (
    <div className={`min-h-screen bg-background text-foreground font-sans overflow-hidden relative ${className}`}>
        {/* ========================================
            QUADRILLAGES DIAGONAUX ANIMÉS (en arrière-plan)
            ======================================== */}
        <div ref={backgroundRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Quadrillage 1 : Diagonal 45deg */}
          <div 
            className="pattern absolute w-[150%] h-[150%] opacity-20 animate-patternScroll pointer-events-none" 
            style={{ 
              top: '-25%', 
              left: '-25%',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--border)) 20px, hsl(var(--border)) 22px)',
              zIndex: 0
            }}
          />
          {/* Quadrillage 2 : Diagonal -45deg avec délai */}
          <div 
            className="pattern absolute w-[150%] h-[150%] opacity-10 animate-patternScroll pointer-events-none" 
            style={{ 
              top: '25%', 
              left: '25%',
              background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, hsl(var(--border)) 20px, hsl(var(--border)) 22px)',
              animationDelay: '10s',
              zIndex: 0
            }}
          />
        </div>

        {/* Contenu principal passé en children - au-dessus des quadrillages */}
        <main className="relative z-10">
          {children}
        </main>

      </div>
  );
};

export default BackgroundLayout;
