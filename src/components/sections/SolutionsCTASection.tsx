import React from 'react';
import { ArrowRight } from 'lucide-react';

const SolutionsCTASection = () => {
  return (
    <section className="relative py-12 md:py-16 bg-background overflow-hidden">
      {/* Quadrillages diagonaux animés */}
      <div 
        className="pattern absolute w-[150%] h-[150%] opacity-20 hero-animate-patternScroll pointer-events-none" 
        style={{ 
          top: '-25%', 
          left: '-25%',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
          zIndex: 0
        }}
      />
      <div 
        className="pattern absolute w-[150%] h-[150%] opacity-10 hero-animate-patternScroll pointer-events-none" 
        style={{ 
          top: '25%', 
          left: '25%',
          background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
          animationDelay: '22.5s',
          zIndex: 0
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div 
          className="max-w-3xl mx-auto text-center" 
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards',
            willChange: 'opacity, transform'
          }}
        >
          <a 
            href="/NosSolutions" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors group text-base md:text-lg font-medium"
          >
            Nos Solutions <span className="hero-gradient-text">IArche</span>
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default SolutionsCTASection;