import React from 'react';
import GradientButton from '@/components/ui/GradientButton';

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 px-6 text-center bg-background">
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 invisible animate-fadeIn [animation-delay:0.2s]">
        Une question sur votre projet ?
      </h2>
      
      <div className="invisible animate-fadeIn [animation-delay:0.4s]">
        <GradientButton href="/contact" size="lg">
          Parlons-en →
        </GradientButton>
      </div>
    </section>
  );
};

export default CTASection;
