import React from 'react';
import { ArrowRight } from 'lucide-react';

const SolutionsCTASection = () => {
  return (
    <section className="relative py-8 md:py-12 bg-background">
      <div className="container mx-auto px-6">
        <a 
          href="/solutions"
          className="block relative rounded-lg py-12 md:py-16 px-6 md:px-8 overflow-hidden transition-all duration-500 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
            {/* Quadrillages diagonaux animés */}
            <div className="pattern absolute w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-20 animate-patternScroll pointer-events-none z-0 [background:repeating-linear-gradient(45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />
            <div className="pattern absolute w-[150%] h-[150%] top-1/4 left-1/4 opacity-10 animate-patternScroll [animation-delay:10s] pointer-events-none z-0 [background:repeating-linear-gradient(-45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />
            
            <div className="max-w-3xl mx-auto text-center invisible animate-fadeIn [animation-delay:0.2s] relative z-10">
              <div className="inline-flex items-center group-hover:opacity-80 transition-opacity text-xl md:text-2xl font-semibold">
                <span className="hero-gradient-text">Nos Solutions IArche</span>
                <ArrowRight className="ml-3 size-6 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </div>
        </a>
      </div>
    </section>
  );
};

export default SolutionsCTASection;
