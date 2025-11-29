import React from 'react';
import { ArrowRight } from 'lucide-react';

const SolutionsCTASection = () => {
  return (
    <section className="relative py-12 md:py-16 bg-background overflow-hidden">
      {/* Quadrillages diagonaux animés */}
      <div className="pattern absolute w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-20 animate-patternScroll pointer-events-none z-0 [background:repeating-linear-gradient(45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />
      <div className="pattern absolute w-[150%] h-[150%] top-1/4 left-1/4 opacity-10 animate-patternScroll [animation-delay:10s] pointer-events-none z-0 [background:repeating-linear-gradient(-45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center invisible animate-fadeIn [animation-delay:0.2s]">
          <a 
            href="/solutions" 
            className="inline-flex items-center text-primary hover:text-primary/80 focus:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded transition-colors group text-lg md:text-xl font-semibold"
          >
            Nos Solutions <span className="hero-gradient-text"> IArche</span>
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default SolutionsCTASection;
