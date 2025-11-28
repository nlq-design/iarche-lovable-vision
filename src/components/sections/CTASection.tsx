import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 px-6 text-center bg-background">
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 invisible animate-fadeIn [animation-delay:0.2s]">
        Une question sur votre projet ?
      </h2>
      
      <div className="invisible animate-fadeIn [animation-delay:0.4s]">
        <NavLink to="/contact">
          <Button 
            className="bg-accent hover:bg-accent/90 focus:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-white font-medium px-10 py-4 text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Parlons-en →
          </Button>
        </NavLink>
      </div>
    </section>
  );
};

export default CTASection;
