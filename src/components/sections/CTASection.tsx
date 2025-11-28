import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 px-6 text-center bg-background">
      <p 
        className="text-2xl md:text-3xl font-semibold text-foreground mb-8"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.2s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Une question sur votre projet ?
      </p>
      
      <div
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.4s forwards',
          willChange: 'opacity, transform'
        }}
      >
        <NavLink to="/contact">
          <Button 
            className="bg-accent hover:bg-accent/90 text-white font-medium px-10 py-4 text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Parlons-en →
          </Button>
        </NavLink>
      </div>
    </section>
  );
};

export default CTASection;
