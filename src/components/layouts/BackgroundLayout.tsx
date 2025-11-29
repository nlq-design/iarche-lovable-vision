import React, { useEffect, ReactNode } from 'react';

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

  return (
    <div className={`min-h-screen bg-background text-foreground font-sans overflow-hidden relative ${className}`}>
        {/* ========================================
            QUADRILLAGES DIAGONAUX ANIMÉS (en arrière-plan)
            ======================================== */}
        {/* Quadrillage 1 : Diagonal 45deg */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-20 animate-patternScroll pointer-events-none" 
          style={{ 
            top: '-25%', 
            left: '-25%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--border)) 20px, hsl(var(--border)) 22px)',
            zIndex: 0
          }}
          aria-hidden="true"
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
          aria-hidden="true"
        />

        {/* Contenu principal passé en children - au-dessus des quadrillages */}
        <div className="relative z-10">
          {children}
        </div>

      </div>
  );
};

export default BackgroundLayout;
