import React from 'react';
import { ArrowRight } from 'lucide-react';

const SolutionsCTASection = () => {
  return (
    <section className="relative py-8 md:py-12 bg-background">
      <div className="container mx-auto px-6">
        <a 
          href="/solutions"
          className="block relative rounded-lg p-[2px] bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[length:100%_100%] transition-all duration-500 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <div className="bg-background rounded-lg py-12 md:py-16 px-6 md:px-8 relative overflow-hidden">
            {/* Quadrillages diagonaux animés */}
            <div className="pattern absolute w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-20 animate-patternScroll pointer-events-none z-0 [background:repeating-linear-gradient(45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />
            <div className="pattern absolute w-[150%] h-[150%] top-1/4 left-1/4 opacity-10 animate-patternScroll [animation-delay:10s] pointer-events-none z-0 [background:repeating-linear-gradient(-45deg,transparent,transparent_20px,hsl(var(--border))_20px,hsl(var(--border))_22px)]" aria-hidden="true" />
            
            <div className="max-w-3xl mx-auto text-center invisible animate-fadeIn [animation-delay:0.2s] relative z-10">
              <div className="inline-flex items-center text-primary group-hover:text-primary/80 transition-colors text-2xl md:text-3xl font-semibold">
                Nos Solutions <span className="hero-gradient-text"> IArche</span>
                <ArrowRight className="ml-3 size-6 md:size-7 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
};

export default SolutionsCTASection;
