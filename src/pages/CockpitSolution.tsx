import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutGrid, Users, Briefcase, Share2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  Section,
  Reveal,
  Eyebrow,
  HeroEyebrow,
  SectionTitle,
  AnimatedArc,
  Particles,
  SolidCard,
  IconChip,
  BtnPrimary,
  FinalCtaPanel,
  Signoff,
} from '@/components/brand';

/* ── Modules du produit ───────────────────────────────────────────── */
const MODULES = [
  {
    num: '01',
    icon: <LayoutGrid className="w-6 h-6" aria-hidden="true" />,
    variant: 'terra' as const,
    title: 'Pipeline',
    desc: "Kanban commercial en temps réel. Visualisez chaque opportunité, suivez les mouvements et identifiez les blocages avant qu'ils n'arrivent.",
  },
  {
    num: '02',
    icon: <Users className="w-6 h-6" aria-hidden="true" />,
    variant: 'navy' as const,
    title: 'Leads',
    desc: "Enrichissement automatique Pappers, scoring IA, qualification des contacts. Chaque lead arrive contextualisé avant le premier échange.",
  },
  {
    num: '03',
    icon: <Briefcase className="w-6 h-6" aria-hidden="true" />,
    variant: 'olive' as const,
    title: 'Projets',
    desc: "Suivi d'avancement, jalons et documents rattachés. De la signature à la livraison, tout est tracé dans un seul espace.",
  },
  {
    num: '04',
    icon: <Share2 className="w-6 h-6" aria-hidden="true" />,
    variant: 'terra' as const,
    title: 'Partenaires',
    desc: "Espace de collaboration externe. Partagez des leads, suivez les contributions et pilotez vos apporteurs d'affaires.",
  },
];

/* ── Convictions ──────────────────────────────────────────────────── */
const CONVICTIONS: Array<{ mark: string; body: ReactNode }> = [
  {
    mark: '01',
    body: (
      <>
        <strong>L'IA enrichit, vous décidez.</strong> Scoring, contexte, suggestions — l'IA vous
        donne les éléments, vous gardez le jugement final.
      </>
    ),
  },
  {
    mark: '02',
    body: (
      <>
        <strong>Un seul espace, zéro friction.</strong> Pipeline, leads, projets et partenaires
        se parlent en temps réel — plus de copier-coller entre CRM, tableur et messagerie.
      </>
    ),
  },
  {
    mark: '03',
    body: (
      <>
        <strong>Souverain et hébergé en France.</strong> Vos données commerciales restent sous
        votre contrôle, chez des prestataires français et européens.
      </>
    ),
  },
];

/* ── Page principale ──────────────────────────────────────────────── */
const CockpitSolution = () => {
  return (
    <>
      <Helmet>
        <title>Cockpit by IArche — CRM commercial augmenté à l'IA</title>
        <meta
          name="description"
          content="Pilotez leads, pipeline, projets et partenaires depuis un seul espace augmenté par l'IA. Hébergé en France, conçu pour indépendants et équipes ambitieuses."
        />
        <link rel="canonical" href="https://iarche.fr/cockpit-solution" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        <meta property="og:title" content="Cockpit by IArche — CRM commercial augmenté à l'IA" />
        <meta
          property="og:description"
          content="Pilotez leads, pipeline, projets et partenaires depuis un seul espace augmenté par l'IA. Hébergé en France."
        />
        <meta property="og:url" content="https://iarche.fr/cockpit-solution" />
        <meta property="og:image" content="https://iarche.fr/og/solutions.png" />
        <meta property="og:image:alt" content="Cockpit by IArche — CRM commercial augmenté à l'IA" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cockpit by IArche — CRM commercial augmenté à l'IA" />
        <meta
          name="twitter:description"
          content="Pilotez leads, pipeline, projets et partenaires depuis un seul espace augmenté par l'IA."
        />
        <meta name="twitter:image" content="https://iarche.fr/og/solutions.png" />
      </Helmet>

      <Header />

      <main>
        {/* ── 1. Hero ──────────────────────────────────────────────── */}
        <section
          className="sec-dark relative overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32"
          aria-label="Présentation du Cockpit IArche"
        >
          <Particles />

          <div className="relative z-[1] mx-auto w-full max-w-[1180px] px-7 md:px-11">
            <div className="mb-8">
              <HeroEyebrow>CRM · Pilotage commercial augmenté à l'IA</HeroEyebrow>
            </div>

            <h1 className="section-title font-semibold tracking-[-0.025em] leading-[1.04] text-[clamp(34px,5vw,60px)] max-w-[18ch] text-[hsl(var(--cream))]">
              Le cockpit commercial <em>augmenté à l'IA</em>
            </h1>

            <AnimatedArc />

            <p className="ds-lede mt-5 max-w-[52ch]">
              Pilotez votre activité commerciale avec précision. Leads enrichis, pipeline
              structuré, projets suivis, partenaires connectés — le tout alimenté par l'IA,
              hébergé en France.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <BtnPrimary to="/login">Accéder au Cockpit</BtnPrimary>
              <Link
                to="/cockpit/pricing"
                className="group inline-flex items-center gap-2 text-[15px] font-medium text-[hsl(var(--cream)/0.82)] hover:text-[hsl(var(--accent-soft))] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--accent-vivid))]"
              >
                Voir les tarifs
                <span
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Modules ───────────────────────────────────────────── */}
        <Section tone="light" spacing="section">
          <SectionTitle
            eyebrow="Les modules"
            lede="Quatre modules pensés pour les indépendants et les équipes commerciales — chacun augmenté par l'IA, tous interconnectés."
            as="h2"
          >
            Quatre modules, <em>un seul cockpit</em>
          </SectionTitle>

          <div className="mt-12 space-y-6">
            {/* Module vedette : Leads — le plus riche (enrichissement Pappers + scoring IA) */}
            <Reveal delay={90}>
              <SolidCard className="md:flex md:flex-row md:items-start md:gap-10">
                <div className="shrink-0 md:w-52">
                  <div className="ds-card-num">02</div>
                  <IconChip variant="navy">
                    <Users className="w-6 h-6" aria-hidden="true" />
                  </IconChip>
                  <h3 className="mt-3">Leads</h3>
                </div>
                <div className="mt-5 md:mt-0">
                  <p>
                    Enrichissement automatique Pappers, scoring IA, qualification des contacts.
                    Chaque lead arrive contextualisé avant le premier échange.
                  </p>
                  <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[hsl(var(--text-subtle))]">
                    <li className="flex items-baseline gap-2">
                      <span className="shrink-0 font-semibold text-[hsl(var(--accent-vivid))]" aria-hidden="true">—</span>
                      Enrichissement Pappers automatique (SIREN, dirigeants, effectifs)
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="shrink-0 font-semibold text-[hsl(var(--accent-vivid))]" aria-hidden="true">—</span>
                      Scoring IA configurable par secteur d'activité
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span className="shrink-0 font-semibold text-[hsl(var(--accent-vivid))]" aria-hidden="true">—</span>
                      Qualification et déduplication des contacts
                    </li>
                  </ul>
                </div>
              </SolidCard>
            </Reveal>

            {/* Modules secondaires : Pipeline, Projets, Partenaires */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[MODULES[0], MODULES[2], MODULES[3]].map((mod, i) => (
                <Reveal key={mod.num} delay={(i + 1) * 90}>
                  <SolidCard num={mod.num} className="h-full">
                    <IconChip variant={mod.variant}>{mod.icon}</IconChip>
                    <h3>{mod.title}</h3>
                    <p>{mod.desc}</p>
                  </SolidCard>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 3. Conviction ────────────────────────────────────────── */}
        <Section tone="warm" spacing="section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <SectionTitle eyebrow="Pourquoi Cockpit" as="h2" arc>
              L'IA <em>se construit</em> avec vous — pas à votre place
            </SectionTitle>

            <div className="space-y-5 lg:pt-2">
              {CONVICTIONS.map((c, i) => (
                <Reveal key={c.mark} delay={i * 80}>
                  <div className="ds-principle">
                    <span className="mark">{c.mark}</span>
                    <span className="body">{c.body}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 4. Teaser tarifs ─────────────────────────────────────── */}
        <Section tone="dark" spacing="compact">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <p className="text-[hsl(var(--cream))] font-semibold text-lg tracking-tight">
                Plans disponibles — Starter, Pro, Enterprise
              </p>
              <p className="text-[hsl(var(--cream)/0.65)] text-sm mt-1">
                Mensuel ou annuel avec remise 20&nbsp;%, sans engagement long.
              </p>
            </div>
            <Link
              to="/cockpit/pricing"
              className="group inline-flex items-center gap-2 shrink-0 text-[15px] font-semibold text-[hsl(var(--accent-soft))] hover:text-[hsl(var(--cream))] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--accent-vivid))]"
              aria-label="Consulter la page des tarifs Cockpit"
            >
              Voir tous les tarifs
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </Section>

        {/* ── 5. Final CTA ─────────────────────────────────────────── */}
        <Section tone="dark" spacing="section">
          <FinalCtaPanel
            info={['À partir de 49€/mois', 'Hébergé en France', 'Support inclus']}
          >
            <Eyebrow center className="mb-0">Prêt à démarrer</Eyebrow>
            <h2 className="section-title font-semibold tracking-[-0.025em] leading-[1.04] text-[clamp(28px,4vw,48px)] text-[hsl(var(--cream))] mt-4 mb-5 mx-auto max-w-[22ch]">
              Votre cockpit commercial,{' '}
              <em>opérationnel en 5 minutes</em>
            </h2>
            <p className="text-[hsl(var(--cream)/0.68)] text-base max-w-[44ch] mx-auto mb-8">
              Créez votre espace de travail, importez vos premiers contacts et laissez l'IA
              enrichir votre pipeline dès aujourd'hui.
            </p>
            <BtnPrimary to="/login">Créer mon espace</BtnPrimary>
          </FinalCtaPanel>
        </Section>

        {/* ── 6. Signoff ───────────────────────────────────────────── */}
        <Section tone="light" spacing="compact">
          <Signoff
            slogan={
              <>
                L'IA <em>se construit</em> avec vous.
              </>
            }
            baseline="IArche · Cockpit Commercial · Bayonne, Pays Basque"
          />
        </Section>
      </main>

      <Footer />
    </>
  );
};

export default CockpitSolution;
