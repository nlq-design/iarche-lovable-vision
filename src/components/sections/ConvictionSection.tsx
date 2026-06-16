import React from 'react';
import { Section, SectionTitle, Reveal } from '@/components/brand';

/**
 * 02 — Notre conviction (manifeste).
 * Moment éditorial fort sur fond sombre : la philosophie IArche.
 */
const ConvictionSection = () => {
  return (
    <Section tone="dark" container="narrow">
      <div className="flex flex-col items-center text-center">
        <SectionTitle center eyebrow="02 — Notre conviction">
          Pas un logiciel <em>de plus.</em>
        </SectionTitle>

        <Reveal delay={120} className="mt-7 max-w-[58ch] space-y-5">
          <p className="text-lg md:text-xl leading-relaxed text-[hsl(var(--cream)/0.82)]">
            L'IA utile, ce n'est pas une licence de plus à empiler. C'est un système
            taillé pour <strong className="text-[hsl(var(--cream))] font-semibold">votre métier</strong>,
            qui reprend le répétitif et vous rend du temps.
          </p>
          <p className="text-lg md:text-xl leading-relaxed text-[hsl(var(--cream)/0.82)]">
            Vous gardez la main : l'assistant prépare, <em className="text-[hsl(var(--accent-flame))]">vous décidez.</em>
            {' '}On commence petit, on mesure, on étend. Et ce qu'on construit
            <strong className="text-[hsl(var(--cream))] font-semibold"> reste à vous.</strong>
          </p>
        </Reveal>
      </div>
    </Section>
  );
};

export default ConvictionSection;
