import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useCTATracking } from '@/hooks/useCTATracking';

const SolutionsCTASection = () => {
  const { trackCTAClick } = useCTATracking();

  return (
    <section className="relative py-8 md:py-12 bg-background">
      <div className="container mx-auto px-6">
        <a 
          href="/solutions"
          onClick={() => trackCTAClick('nos_solutions', 'solutions_cta_section')}
          className="block relative rounded-lg py-12 md:py-16 px-6 md:px-8 overflow-hidden transition-all duration-500 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-background"
        >
            <div className="max-w-3xl mx-auto text-center invisible animate-fadeIn [animation-delay:0.2s] relative z-10">
              <div className="inline-flex items-center group-hover:opacity-80 transition-opacity text-xl md:text-2xl font-semibold">
                <span className="hero-gradient-text relative">
                  Nos Solutions IArche
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary via-accent to-primary transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
                </span>
                <ArrowRight className="ml-3 size-6 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </div>
        </a>
      </div>
    </section>
  );
};

export default SolutionsCTASection;
