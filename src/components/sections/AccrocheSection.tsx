import React from 'react';
import GradientLink from '@/components/ui/GradientLink';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Section, SectionTitle, Reveal } from '@/components/brand';

const AccrocheSection = () => {
  const { trackCTAClick } = useCTATracking();
  return (
    <Section tone="light" container="narrow">
      <SectionTitle center eyebrow="01 — Le constat" titleClassName="!max-w-[20ch]">
        Dirigeant, indépendant ou <em>porteur de projet IA</em> ?
      </SectionTitle>

      <Reveal delay={120} className="mt-6 text-center">
        <p className="text-lg md:text-xl text-foreground max-w-2xl mx-auto leading-relaxed mb-2">
          Vous savez que l'IA peut transformer votre quotidien,<br className="hidden sm:block" />
          mais par où commencer concrètement ?
        </p>
        <p className="text-base text-text-subtle max-w-xl mx-auto leading-relaxed mb-8">
          On vous accompagne de l'audit à l'autonomie.
        </p>
        <GradientLink
          to="/rendez-vous/premier-echange"
          onClick={() => trackCTAClick('premier_echange', 'accroche_section')}
          className="text-base"
        >
          Échanger avec nous
        </GradientLink>
      </Reveal>
    </Section>
  );
};
export default AccrocheSection;
