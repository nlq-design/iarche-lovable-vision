import React from 'react';
import GradientLink from '@/components/ui/GradientLink';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 md:py-28 px-6 text-center bg-background">
      <div className="invisible animate-fadeIn [animation-delay:0.4s]">
        <GradientLink href="/contact" className="text-xl md:text-2xl">
          <span>Premier échange</span>
          <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
        </GradientLink>
      </div>
    </section>
  );
};

export default CTASection;
