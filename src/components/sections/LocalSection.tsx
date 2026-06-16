import React from 'react';
import { MapPin, User, Globe } from 'lucide-react';
import { Section, SectionTitle, IconChip, Reveal } from '@/components/brand';

const points = [
  {
    icon: MapPin,
    title: 'Ancrés au Pays Basque',
    text: "IArche est né à Bayonne. On connaît le tissu local, les dirigeants d'ici, leurs réalités.",
  },
  {
    icon: User,
    title: 'Un interlocuteur unique',
    text: 'Pas de support offshore ni de hotline. Un architecte joignable, qui connaît votre dossier.',
  },
  {
    icon: Globe,
    title: 'Et partout en France',
    text: 'Engagés localement, nous intervenons à distance dans toute la France.',
  },
];

/**
 * 06 — Ici, et partout : l'ancrage local & humain (différenciateur souveraineté).
 */
const LocalSection = () => {
  return (
    <Section tone="warm">
      <div className="flex flex-col items-center text-center">
        <SectionTitle center eyebrow="06 — Ici, et partout">
          Ancrés à <em>Bayonne.</em>
        </SectionTitle>
      </div>

      <div className="mt-12 grid gap-[18px] grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto">
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={i} delay={i * 80}>
              <div className="h-full rounded-[var(--radius-lg)] bg-background border border-border p-7 text-center flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--accent-soft))]">
                <IconChip variant={i === 0 ? 'terra' : i === 1 ? 'navy' : 'olive'}>
                  <Icon className="size-6 text-foreground" aria-hidden="true" />
                </IconChip>
                <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                <p className="text-[15px] leading-relaxed text-text-subtle">{p.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
};

export default LocalSection;
