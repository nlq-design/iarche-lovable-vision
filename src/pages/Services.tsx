import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import GradientLink from '@/components/ui/GradientLink';
import IArcheLink from '@/components/ui/IArcheLink';

const Services = () => {
  const services = [
    {
      id: 'audit',
      title: 'Audit & Conseil',
      description: 'Diagnostic personnalisé de votre maturité IA et définition d\'une feuille de route adaptée à vos enjeux métier.',
      livrables: [
        'Cartographie des cas d\'usage prioritaires',
        'Évaluation de la maturité technologique',
        'Plan d\'action chiffré et priorisé',
        'Recommandations d\'outils et partenaires'
      ],
      pourQui: 'Dirigeants de PME souhaitant structurer leur démarche IA sans partir d\'une page blanche.',
      cta: 'Demander un diagnostic',
      ctaLink: '/contact'
    },
    {
      id: 'developpement',
      title: 'Développement & Intégration',
      description: 'Conception et déploiement de solutions IA sur-mesure, du POC à la production, avec accompagnement technique complet.',
      livrables: [
        'Prototypage rapide (POC en 2-4 semaines)',
        'Architecture scalable et maintenable',
        'Intégration avec vos outils existants',
        'Documentation technique et transfert de compétences'
      ],
      pourQui: 'Entreprises prêtes à industrialiser un cas d\'usage métier concret nécessitant une expertise technique pointue.',
      cta: 'Discuter de votre projet',
      ctaLink: '/contact'
    },
    {
      id: 'accompagnement',
      title: 'Accompagnement & Autonomie',
      description: 'Montée en compétences de vos équipes via formations pratiques, coaching et transfert de connaissances opérantes.',
      livrables: [
        'Formations techniques (prompting, fine-tuning, RAG)',
        'Ateliers métier (cas d\'usage, ROI, éthique)',
        'Coaching individuel ou collectif',
        'Documentation et guides internes personnalisés'
      ],
      pourQui: 'Organisations visant l\'autonomie et l\'acculturation IA de leurs collaborateurs sans dépendance à un prestataire.',
      cta: 'Planifier une formation',
      ctaLink: '/contact'
    },
    {
      id: 'conformite',
      title: 'Conformité & Réglementation',
      description: 'Mise en conformité RGPD et AI Act, audit de vos systèmes IA et accompagnement juridique adapté.',
      livrables: [
        'Audit de conformité RGPD et AI Act',
        'Documentation réglementaire (registres, impacts)',
        'Recommandations d\'implémentation',
        'Veille réglementaire continue'
      ],
      pourQui: 'Entreprises soumises aux obligations réglementaires ou anticipant les futures exigences de l\'AI Act.',
      cta: 'Auditer ma conformité',
      ctaLink: '/contact'
    }
  ];

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Nos services · IArche · Agence IA Bayonne</title>
        <meta name="description" content="Audit IA, développement, formation et conformité. Accompagnement adapté à votre maturité IA. Agence basée à Bayonne." />
        <link rel="canonical" href="https://iarche.fr/services" />
        <meta property="og:title" content="Nos services · IArche · Agence IA Bayonne" />
        <meta property="og:description" content="Audit IA, développement, formation et conformité. Accompagnement adapté à votre maturité IA." />
        <meta property="og:url" content="https://iarche.fr/services" />
        <meta property="og:type" content="website" />

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
                "serviceOutput": service.livrables.join(", "),
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
      
      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Nos services
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Accompagnement IA adapté à votre stade de maturité
            </p>
          </div>

          {/* Liste des services */}
          <div className="space-y-12">
            {services.map((service, index) => (
              <Card 
                key={service.id}
                className="invisible animate-fadeIn hover:shadow-lg transition-shadow duration-300"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl text-primary">
                    {service.title}
                  </CardTitle>
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
                    <IArcheLink href={`/services/${service.id}`}>
                      En savoir plus
                    </IArcheLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA global */}
          <div className="text-center mt-16 invisible animate-fadeIn [animation-delay:0.9s]">
            <p className="text-lg text-foreground mb-6">
              Une question sur votre projet ?
            </p>
            <GradientLink href="/contact" className="text-lg">
              Parlons-en
            </GradientLink>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Services;
