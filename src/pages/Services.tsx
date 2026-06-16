import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { CheckCircle } from 'lucide-react';
import { Section, SectionTitle, Reveal, SolidCard, GlassCard, BtnPrimary } from '@/components/brand';
import { useCTATracking } from '@/hooks/useCTATracking';

const Services = () => {
  const { trackCTAClick } = useCTATracking();
  const services = [
    {
      id: 'audit',
      title: 'Audit & Conseil',
      description: 'Comprendre où vous en êtes et définir par où commencer.',
      livrables: [
        'Cartographie des cas d\'usage prioritaires',
        'Évaluation de la maturité technologique',
        'Plan d\'action chiffré et priorisé',
        'Recommandations d\'outils et partenaires'
      ],
      pourQui: 'Pour ceux qui veulent avancer sur l\'IA sans partir dans tous les sens.',
      cta: 'Demander un audit',
      ctaLink: '/contact',
      ctaDetail: 'Découvrir l\'audit IA'
    },
    {
      id: 'developpement',
      title: 'Développement & Intégration',
      description: 'Construire et déployer des solutions qui marchent dans votre contexte.',
      livrables: [
        'Prototypage rapide (maquette en 2-4 semaines)',
        'Architecture adaptée à vos besoins',
        'Intégration avec vos outils existants',
        'Documentation technique et transfert de compétences'
      ],
      pourQui: 'TPE, PME, indépendants, collectivités — l\'IA s\'adresse à tous.',
      cta: 'Discuter de votre projet',
      ctaLink: '/contact',
      ctaDetail: 'Voir nos développements'
    },
    {
      id: 'accompagnement',
      title: 'Accompagnement & Autonomie',
      description: 'Rendre vos équipes capables de continuer sans nous.',
      livrables: [
        'Sessions techniques (prompting, fine-tuning, RAG)',
        'Ateliers métier (cas d\'usage, ROI, éthique)',
        'Accompagnement individuel ou collectif',
        'Documentation et guides internes personnalisés'
      ],
      pourQui: 'Acculturer, accompagner, rendre autonome — pour tous ceux qui veulent intégrer l\'IA durablement.',
      cta: 'Planifier un accompagnement',
      ctaLink: '/contact',
      ctaDetail: 'Explorer l\'accompagnement'
    },
    {
      id: 'conformite',
      title: 'Conformité & Réglementation',
      description: 'S\'assurer que vos projets IA respectent les règles du jeu.',
      livrables: [
        'Audit de conformité RGPD et AI Act',
        'Documentation réglementaire (registres, impacts)',
        'Recommandations d\'implémentation',
        'Veille réglementaire continue'
      ],
      pourQui: 'Entreprises soumises aux obligations réglementaires et/ou anticipant les futures exigences de l\'AI Act.',
      cta: 'Auditer ma conformité',
      ctaLink: '/contact',
      ctaDetail: 'Comprendre la conformité IA'
    }
  ];

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/services" />
        <title>Nos services · IArche · Architecte IA Bayonne</title>
        <meta name="description" content="Découvrez nos 4 services d'accompagnement IA : audit, développement, accompagnement à l'autonomie et conformité réglementaire." />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content="services IA, audit IA, développement IA, accompagnement IA, conformité RGPD, PME, Bayonne" />
        <link rel="canonical" href="https://iarche.fr/services" />

        {/* Open Graph */}
        <meta property="og:title" content="Nos services · IArche · Architecte IA Bayonne" />
        <meta property="og:description" content="Audit IA, développement, accompagnement et conformité. Services adaptés aux PME." />
        <meta property="og:url" content="https://iarche.fr/services" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og/services.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Nos services · IArche" />
        <meta name="twitter:description" content="Audit IA, développement, accompagnement et conformité pour PME." />
        <meta name="twitter:image" content="https://iarche.fr/og/services.png" />

        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://iarche.fr/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Services",
                "item": "https://iarche.fr/services"
              }
            ]
          })}
        </script>

        {/* Schema.org ItemList - Services offered */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": services.map((service, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Service",
                "@id": `https://iarche.fr/services#${service.id}`,
                "name": service.title,
                "description": service.description,
                "provider": {
                  "@type": "Organization",
                  "name": "IArche",
                  "url": "https://iarche.fr"
                },
                "areaServed": {
                  "@type": "Country",
                  "name": "France"
                },
                "serviceOutput": service.livrables,
                "audience": {
                  "@type": "Audience",
                  "audienceType": service.pourQui
                },
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "EUR",
                  "price": "Sur devis",
                  "url": `https://iarche.fr${service.ctaLink}`
                }
              }
            }))
          })}
        </script>
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main>
        {/* Hero */}
        <Section tone="dark" spacing="hero">
          <SectionTitle
            as="h1"
            center
            eyebrow="Ce qu'on fait"
            lede="Audit, développement, accompagnement, conformité."
          >
            Nos <em>services.</em>
          </SectionTitle>
        </Section>

        {/* Liste des services — rythme de tons : light → warm → dark → light */}
        {services.map((service, index) => {
          const tones = ['light', 'warm', 'dark', 'light'] as const;
          const tone = tones[index % tones.length];
          const isDark = tone === 'dark';
          const num = String(index + 1).padStart(2, '0');
          const CardComp = isDark ? GlassCard : SolidCard;

          return (
            <Section key={service.id} tone={tone} container="narrow" id={service.id}>
              <Reveal>
                <CardComp num={num}>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>

                  <div className="mt-6 space-y-6">
                    {/* Livrables */}
                    <div>
                      <h4
                        className={
                          isDark
                            ? 'text-sm font-semibold uppercase tracking-wide text-[hsl(var(--cream)/0.72)] mb-3'
                            : 'text-sm font-semibold uppercase tracking-wide text-foreground mb-3'
                        }
                      >
                        Livrables
                      </h4>
                      <ul className="space-y-2">
                        {service.livrables.map((livrable, idx) => (
                          <li
                            key={idx}
                            className={
                              isDark
                                ? 'flex items-start gap-2 text-[hsl(var(--cream)/0.72)]'
                                : 'flex items-start gap-2 text-muted-foreground'
                            }
                          >
                            <CheckCircle
                              className={
                                isDark
                                  ? 'w-5 h-5 text-[hsl(var(--accent-soft))] shrink-0 mt-0.5'
                                  : 'w-5 h-5 text-primary shrink-0 mt-0.5'
                              }
                              aria-hidden="true"
                            />
                            <span>{livrable}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pour qui */}
                    <div>
                      <h4
                        className={
                          isDark
                            ? 'text-sm font-semibold uppercase tracking-wide text-[hsl(var(--cream)/0.72)] mb-2'
                            : 'text-sm font-semibold uppercase tracking-wide text-foreground mb-2'
                        }
                      >
                        Pour qui ?
                      </h4>
                      <p className={isDark ? 'text-[hsl(var(--cream)/0.72)]' : 'text-muted-foreground'}>
                        {service.pourQui}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="pt-2">
                      <a
                        href={`/services/${service.id}`}
                        onClick={() => trackCTAClick('en_savoir_plus_service', 'services_page', service.id)}
                        className={
                          isDark
                            ? 'inline-flex items-center text-sm font-medium text-[hsl(var(--accent-soft))] hover:text-[hsl(var(--cream))] transition-colors'
                            : 'inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity'
                        }
                      >
                        {service.ctaDetail}
                      </a>
                    </div>
                  </div>
                </CardComp>
              </Reveal>
            </Section>
          );
        })}

        {/* CTA final */}
        <Section tone="warm" spacing="compact">
          <div className="text-center flex flex-col items-center">
            <Reveal>
              <p className="text-lg text-foreground mb-6">
                Prêt à démarrer ?
              </p>
              <BtnPrimary
                href="/contact"
                onClick={() => trackCTAClick('premier_echange', 'services_page_bottom')}
              >
                Premier échange
              </BtnPrimary>
            </Reveal>
          </div>
        </Section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default Services;
