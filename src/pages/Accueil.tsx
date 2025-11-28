import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { Helmet } from 'react-helmet';

const Accueil = () => {
  return (
    <>
      <Helmet>
        <title>Accueil · IArche · Agence IA pour PME</title>
        <meta name="description" content="Découvrez IArche, agence IA française spécialisée dans le conseil et l'intégration d'intelligence artificielle pour PME. L'IA se construit avec vous." />
      </Helmet>
      
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center relative">
          <div className="container z-10 relative px-6 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight font-semibold mb-8 hero-animate-fadeIn hero-stagger-1" style={{ visibility: 'hidden' }}>
                <span className="text-foreground">Bienvenue chez </span>
                <span className="hero-gradient-text">IArche</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 hero-animate-fadeIn hero-stagger-2" style={{ visibility: 'hidden' }}>
                L'IA se construit avec vous
              </p>

              <div className="prose prose-lg mx-auto text-left hero-animate-fadeIn hero-stagger-3" style={{ visibility: 'hidden' }}>
                <p className="text-muted-foreground mb-6">
                  IArche accompagne les dirigeants de PME françaises dans l'intégration concrète de l'intelligence artificielle, de l'audit à l'autonomie.
                </p>
                
                <p className="text-muted-foreground">
                  Notre approche : du concret, pas des slides. Des résultats mesurables, pas des promesses.
                </p>
              </div>

              <div className="mt-16 hero-animate-fadeIn hero-stagger-4" style={{ visibility: 'hidden' }}>
                <a 
                  href="#expertise" 
                  className="inline-flex items-center gap-2 text-primary font-medium text-lg hover:gap-3 transition-all duration-300 group"
                >
                  Découvrir notre expertise
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
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-0 right-0 text-center z-10">
            <a 
              href="/" 
              className="text-sm text-muted-foreground hover:text-accent transition-all duration-300"
            >
              ← Retour au portail
            </a>
          </div>
        </div>
      </BackgroundLayout>
    </>
  );
};

export default Accueil;
