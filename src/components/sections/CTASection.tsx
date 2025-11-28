import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="py-16 px-6 text-center">
      <p 
        className="text-xl font-medium text-foreground mb-6"
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
            className="bg-accent hover:bg-accent/90 text-white font-medium px-8 py-3 text-base rounded-lg transition-all duration-200"
          >
            Parlons-en →
          </Button>
        </NavLink>
      </div>
    </section>
  );
};

export default CTASection;
