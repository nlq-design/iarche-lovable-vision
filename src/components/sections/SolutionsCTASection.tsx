import React from 'react';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Section, SectionTitle, BtnPrimary, Reveal } from '@/components/brand';

/**
 * 05 — Nos plateformes : les solutions SaaS souveraines IArche (clair).
 */
const SolutionsCTASection = () => {
  const { trackCTAClick } = useCTATracking();

  return (
    <Section tone="light" container="narrow">
      <div className="flex flex-col items-center text-center">
        <SectionTitle
          center
          eyebrow="05 — Nos plateformes"
          lede="Au-delà du sur-mesure, IArche conçoit ses propres solutions SaaS souveraines — pensées, construites et opérées en interne."
        >
          Les <em>solutions</em> IArche.
        </SectionTitle>
        <Reveal delay={150} className="mt-9">
          <BtnPrimary to="/solutions" onClick={() => trackCTAClick('nos_solutions', 'solutions_cta_section')}>
            Découvrir nos solutions
          </BtnPrimary>
        </Reveal>
      </div>
    </Section>
  );
};

export default SolutionsCTASection;
