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
        
        /* Animation des rectangles décoratifs (pulsation douce) */
        @keyframes constructionFade {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.5;
            transform: scale(1);
          }
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
        {/* ========================================
            QUADRILLAGES DIAGONAUX ANIMÉS (en arrière-plan)
            ======================================== */}
        {/* Quadrillage 1 : Diagonal 45deg */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-30 hero-animate-patternScroll pointer-events-none" 
          style={{ 
            top: '-25%', 
            left: '-25%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
            zIndex: 0
          }}
        />
        {/* Quadrillage 2 : Diagonal -45deg avec délai */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-20 hero-animate-patternScroll pointer-events-none" 
          style={{ 
            top: '25%', 
            left: '25%',
            background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
            animationDelay: '22.5s',
            zIndex: 0
          }}
        />

        {/* ========================================
            RECTANGLES DÉCORATIFS (Construction)
            ======================================== */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div 
            className="absolute top-20 left-10 w-32 h-32 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />
          <div 
            className="absolute bottom-32 right-20 w-24 h-24 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute top-1/2 right-10 w-40 h-40 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />
          <div 
            className="absolute bottom-20 left-1/4 w-28 h-28 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '3s'
            }}
          />
        </div>

        {/* Contenu principal passé en children - au-dessus des quadrillages */}
        <div className="relative z-10">
          {children}
        </div>

      </div>
    </>
  );
};

export default BackgroundLayout;
