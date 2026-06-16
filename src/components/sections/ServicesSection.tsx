import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Section, SectionTitle, SolidCard, Reveal } from '@/components/brand';

const steps = [
  {
    title: "Audit & Conseil",
    description: "Comprendre où vous en êtes et définir par où commencer.",
  },
  {
    title: "Développement & Intégration",
    description: "Des solutions sur-mesure qui s'intègrent à vos outils existants.",
  },
  {
    title: "Accompagnement & Autonomie",
    description: "On rend vos équipes autonomes. L'IA évolue, votre entreprise aussi.",
  },
  {
    title: "Conformité & Réglementation",
    description: "AI Act, RGPD : intégrer l'IA en restant conforme.",
  },
];

/**
 * 03 — De l'audit à l'autonomie : les 4 services présentés en PARCOURS
 * (étapes numérotées reliées), pas en grille plate.
 */
const ServicesSection = () => {
  return (
    <Section tone="light" id="services">
      <div className="flex flex-col items-center text-center">
        <SectionTitle
          center
          eyebrow="03 — Notre approche"
          lede="On ne vend pas une techno, on construit un chemin : de l'audit jusqu'à votre autonomie."
        >
          De l'audit à <em>l'autonomie.</em>
        </SectionTitle>
      </div>

      <div className="relative mt-14 grid gap-[18px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fil conducteur (parcours) — desktop */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute top-[34px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.45)] to-transparent"
        />
        {steps.map((step, index) => (
          <Reveal key={index} delay={index * 90}>
            <SolidCard num={String(index + 1).padStart(2, '0')} className="h-full grid grid-rows-[auto_auto_1fr_auto]">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <a
                href="/services"
                className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:text-[hsl(var(--accent-deep))] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors group"
              >
                En savoir plus
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </SolidCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
};

export default ServicesSection;
