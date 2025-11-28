import React from 'react';

const PresentationSection = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div 
          className="max-w-3xl mx-auto text-center space-y-4"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards',
            willChange: 'opacity, transform'
          }}
        >
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            <span className="hero-gradient-text font-bold">IArche</span> est une agence IA fondée à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : diagnostic, développement, formation, conformité.
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Engagés localement à Bayonne, nous intervenons aussi partout en France.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PresentationSection;
