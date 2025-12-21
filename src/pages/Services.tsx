import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import GradientLink from '@/components/ui/GradientLink';
import GradientTitle from '@/components/ui/GradientTitle';
import IArcheLink from '@/components/ui/IArcheLink';
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
        <title>Nos services · IArche · Agence IA Bayonne</title>
        <meta name="description" content="Audit IA, développement, accompagnement et conformité. Services adaptés aux PME. Agence basée à Bayonne." />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content="services IA, audit IA, développement IA, accompagnement IA, conformité RGPD, PME, Bayonne" />
        <link rel="canonical" href="https://iarche.fr/services" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Nos services · IArche · Agence IA Bayonne" />
        <meta property="og:description" content="Audit IA, développement, accompagnement et conformité. Services adaptés aux PME." />
        <meta property="og:url" content="https://iarche.fr/services" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Nos services · IArche" />
        <meta name="twitter:description" content="Audit IA, développement, accompagnement et conformité pour PME." />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />

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
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <GradientTitle size="lg" as="h1" className="mb-6 animate-fadeIn [animation-delay:0.1s]">
              Nos services
            </GradientTitle>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Audit, développement, accompagnement, conformité.
            </p>
          </div>

          {/* Liste des services */}
          <div className="space-y-12">
            {services.map((service, index) => (
              <Card 
                key={service.id}
                className="relative animate-fadeIn hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                {/* Bordure gradient à gauche */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                  style={{ background: 'linear-gradient(180deg, #1A2B4A 0%, #B04A32 100%)' }}
                />
                <CardHeader className="pl-5">
                  <div className="flex items-center gap-2">
                    {/* Badge gradient */}
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' }}
                    />
                    <CardTitle className="text-2xl md:text-3xl text-primary">
                      {service.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base md:text-lg mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Livrables */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                      Livrables
                    </h3>
                    <ul className="space-y-2">
                      {service.livrables.map((livrable, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{livrable}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pour qui */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                      Pour qui ?
                    </h3>
                    <p className="text-muted-foreground">
                      {service.pourQui}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="pt-4">
                    <IArcheLink 
                      href={`/services/${service.id}`}
                      onClick={() => trackCTAClick('en_savoir_plus_service', 'services_page', service.id)}
                    >
                      {service.ctaDetail}
                    </IArcheLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16 animate-fadeIn [animation-delay:0.9s]">
            <p className="text-lg text-foreground mb-6">
              Prêt à démarrer ?
            </p>
            <GradientLink 
              href="/contact" 
              className="text-lg"
              onClick={() => trackCTAClick('premier_echange', 'services_page_bottom')}
            >
              Premier échange
            </GradientLink>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Services;
