import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';

const HeroSection = () => {
  return (
    <BackgroundLayout>
      <div className="min-h-screen flex items-center justify-center relative">
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
