import React from 'react';
import GradientButton from '@/components/ui/GradientButton';

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 px-6 text-center bg-background">
      <div className="invisible animate-fadeIn [animation-delay:0.4s]">
        <GradientButton href="/contact" size="lg">
          Premier échange
        </GradientButton>
      </div>
    </section>
  );
};

export default CTASection;
