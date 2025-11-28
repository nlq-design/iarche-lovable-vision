import React from 'react';
const PresentationSection = () => {
  return <section className="pt-8 pb-12 md:pt-12 md:pb-16">
      <div className="container mx-auto px-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8">À propos</h2>
      <div className="max-w-3xl mx-auto text-center space-y-4 invisible animate-fadeIn [animation-delay:0.2s]">
          <p className="text-lg md:text-xl text-primary leading-relaxed">IArche est une agence IA à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : diagnostic, développement, formation, conformité.<span className="hero-gradient-text font-bold">IArche</span> est une agence IA fondée à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : diagnostic, développement, formation, conformité.
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Engagés localement à Bayonne, nous intervenons aussi partout en France.
          </p>
        </div>
      </div>
    </section>;
};
export default PresentationSection;