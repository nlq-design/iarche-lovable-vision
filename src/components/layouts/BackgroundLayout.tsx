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
 * - Lignes SVG animées avec gradients
 * - Toutes les animations keyframes nécessaires
 * 
 * Usage :
 * <BackgroundLayout>
 *   <div>Votre contenu ici</div>
 * </BackgroundLayout>
 */
const BackgroundLayout = ({ children, className = '' }: BackgroundLayoutProps) => {
  useEffect(() => {
    // Animation des lignes SVG avec calcul de longueur et délais échelonnés
    const paths = document.querySelectorAll('.animation-line');
    paths.forEach((path, index) => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Délai échelonné pour animation progressive
      const delay = 500 + (index * 1000);
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 2s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, delay);
    });
  }, []);

  return (
    <>
      <style>
        {`
        /* ========================================
           ANIMATIONS KEYFRAMES - Design System IArche
           ======================================== */
        
        /* Fade In avec prévention FOUC (Flash of Unstyled Content) */
        @keyframes fadeIn {
          0% {
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
          }
          1% {
            visibility: visible;
          }
          100% {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
        }

        /* Gradient animé (pour texte IArche) */
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        /* Scroll du quadrillage diagonal */
        @keyframes patternScroll {
          0% { transform: translate(-5%, -5%); }
          100% { transform: translate(5%, 5%); }
        }
        
        /* Pulse pour boutons/CTA */
        @keyframes subtlePulse {
          0% { 
            box-shadow: 0 0 10px rgba(209, 90, 62, 0.3); 
          }
          50% { 
            box-shadow: 0 0 25px rgba(209, 90, 62, 0.6); 
          }
          100% { 
            box-shadow: 0 0 10px rgba(209, 90, 62, 0.3); 
          }
        }
        
        /* ========================================
           CLASSES D'ANIMATION
           ======================================== */
        
        /* Fade In générique avec will-change pour performance */
        .hero-animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
          visibility: hidden;
          will-change: opacity, transform, visibility;
        }
        
        /* Scroll du pattern de fond */
        .hero-animate-patternScroll {
          animation: patternScroll 20s linear infinite;
        }
        
        /* Pulse animation pour CTA */
        .hero-pulse-animation {
          animation: subtlePulse 2s ease-in-out infinite;
          will-change: box-shadow;
        }
        
        /* Gradient IArche animé (Bleu Nuit → Terracotta) */
        .hero-gradient-text {
          background: linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%));
          background-size: 600% 600%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient 15s ease infinite;
          will-change: background-position;
        }
        
        /* Délais échelonnés pour animations séquentielles */
        .hero-stagger-1 { animation-delay: 0s; }
        .hero-stagger-2 { animation-delay: 0.2s; }
        .hero-stagger-3 { animation-delay: 0.4s; }
        .hero-stagger-4 { animation-delay: 0.6s; }
        `}
      </style>
      
      <div className={`min-h-screen bg-background text-foreground font-sans overflow-hidden relative ${className}`}>
        {/* Contenu principal passé en children */}
        {children}

        {/* ========================================
            LIGNES SVG ANIMÉES
            ======================================== */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
          {/* Ligne 1 : Gradient Bleu Nuit → Terracotta */}
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              className="animation-line" 
              stroke="url(#lineGradient1)"
              style={{ fill: 'none', strokeWidth: 2, opacity: 0.6 }}
              d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 56C51.5359 57.1046 50.6405 58 49.5359 58L0 58"
            />
          </svg>
          
          {/* Ligne 2 : Gradient inversé Terracotta → Bleu Nuit */}
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 176 59" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <path 
              className="animation-line" 
              stroke="url(#lineGradient2)"
              style={{ fill: 'none', strokeWidth: 2, opacity: 0.6 }}
              d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 56C124.464 57.1046 125.36 58 126.464 58L176 58"
            />
          </svg>
        </div>

        {/* ========================================
            QUADRILLAGES DIAGONAUX ANIMÉS
            ======================================== */}
        {/* Quadrillage 1 : Diagonal 45deg */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-20 hero-animate-patternScroll pointer-events-none" 
          style={{ 
            top: '-25%', 
            left: '-25%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)'
          }}
        />
        {/* Quadrillage 2 : Diagonal -45deg avec délai */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-10 hero-animate-patternScroll pointer-events-none" 
          style={{ 
            top: '25%', 
            left: '25%',
            background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
            animationDelay: '22.5s'
          }}
        />

      </div>
    </>
  );
};

export default BackgroundLayout;
