import React, { useEffect } from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';

const HeroSection = () => {
  useEffect(() => {
    // Calcul précis des longueurs de path pour animation fluide
    document.querySelectorAll('.canalisation-line').forEach(path => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Déclenchement de l'animation après court délai
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 2s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 500);
    });
  }, []);

  return (
    <BackgroundLayout>
      <div className="min-h-screen flex items-center justify-center relative">
        {/* ========================================
            RECTANGLES DÉCORATIFS (Construction) - Uniquement sur /
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

        <div className="container text-center z-10 relative px-6 py-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-semibold m-0 relative z-20 mb-20 md:mb-28 hero-animate-fadeIn hero-stagger-1" style={{ visibility: 'hidden' }}>
            <span className="hero-gradient-text">IArche</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed hero-animate-fadeIn hero-stagger-2" style={{ visibility: 'hidden' }}>
            L'IA se construit avec vous
          </p>
          <div className="flex justify-center hero-animate-fadeIn hero-stagger-3" style={{ visibility: 'hidden' }}>
            <a 
              href="/accueil" 
              className="inline-flex items-center gap-2 text-primary font-medium text-lg hover:gap-3 transition-all duration-300 group"
            >
              Découvrir
              <svg 
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* ========================================
            LIGNES SVG ANIMÉES TYPE CANALISATION - Gradients Bleu Nuit ↔ Terracotta
            ======================================== */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none">
            <defs>
              <linearGradient id="canalisationGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              className="canalisation-line" 
              d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 56C51.5359 57.1046 50.6405 58 49.5359 58L0 58"
              fill="none"
              stroke="url(#canalisationGradient1)"
              strokeWidth="2"
            />
          </svg>
          
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 176 59" preserveAspectRatio="none">
            <defs>
              <linearGradient id="canalisationGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <path 
              className="canalisation-line" 
              d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 56C124.464 57.1046 125.36 58 126.464 58L176 58"
              fill="none"
              stroke="url(#canalisationGradient2)"
              strokeWidth="2"
            />
          </svg>
        </div>

        <style>
          {`
            .canalisation-line {
              fill: none;
              stroke-width: 2;
            }
          `}
        </style>

        {/* Ancrage géographique */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10 hero-animate-fadeIn hero-stagger-4" style={{ visibility: 'hidden' }}>
          <p className="text-sm mb-2 text-text-subtle">
            Bayonne · France · <a href="mailto:nlq@iarche.fr" className="hover:underline transition-all duration-200">nlq@iarche.fr</a>
          </p>
          <a 
            href="#contact" 
            className="text-sm text-muted-foreground hover:text-accent inline-flex items-center gap-1 transition-all duration-300 group"
          >
            Une question ?<span className="inline-block w-1"></span>
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default HeroSection;
