import React from 'react';
import { Section, Eyebrow, AnimatedArc, Reveal } from '@/components/brand';

const PresentationSection = () => {
  return (
    <Section tone="warm" container="narrow">
      <div className="flex flex-col items-center text-center">
        <Eyebrow center>À propos</Eyebrow>
        <AnimatedArc center />
        <Reveal delay={120} className="mt-6 max-w-3xl space-y-4">
          <p className="text-xl md:text-2xl text-foreground leading-relaxed font-medium">
            <span className="hero-gradient-text font-bold">IArche</span> est votre Architecte IA, basé à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : <em>audit, développement, accompagnement, conformité.</em>
          </p>
          <p className="text-base md:text-lg text-text-subtle leading-relaxed">
            Engagés localement, nous intervenons aussi partout en France.
          </p>
        </Reveal>
      </div>
    </Section>
  );
};

export default PresentationSection;
