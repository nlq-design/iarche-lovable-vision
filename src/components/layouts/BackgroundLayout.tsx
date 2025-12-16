import React, { ReactNode } from 'react';

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
        {/* Contenu principal - fond uni #FAF9F7 */}
        <main className="relative">
          {children}
        </main>
      </div>
  );
};

export default BackgroundLayout;
