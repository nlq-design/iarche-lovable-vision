import React from 'react';
import { ArrowRight } from 'lucide-react';

const SolutionsCTASection = () => {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-6">
        <div 
          className="max-w-3xl mx-auto text-center"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards',
            willChange: 'opacity, transform'
          }}
        >
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Découvrir les solutions IArche disponibles
          </p>
          <a
            href="/NosSolutions"
            className="inline-flex items-center text-accent hover:text-accent/80 transition-colors group text-base md:text-lg"
          >
            Voir nos solutions
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default SolutionsCTASection;
