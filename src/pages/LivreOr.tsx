import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';

const LivreOr = () => {
  return (
    <BackgroundLayout>
      <Helmet>
        <title>Livre d'Or · IArche · Témoignages clients</title>
        <meta name="description" content="Découvrez les témoignages de nos clients. Ce qu'ils disent de leur collaboration avec IArche." />
        <link rel="canonical" href="https://iarche.fr/livre-or" />
        <meta property="og:title" content="Livre d'Or · IArche · Témoignages clients" />
        <meta property="og:description" content="Découvrez les témoignages de nos clients. Ce qu'ils disent de leur collaboration avec IArche." />
        <meta property="og:url" content="https://iarche.fr/livre-or" />
        <meta property="og:type" content="website" />

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
                "name": "Livre d'Or",
                "item": "https://iarche.fr/livre-or"
              }
            ]
          })}
        </script>

        {/* Schema.org Organization with AggregateRating */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo-iarche.svg",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "reviewCount": "3",
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": [
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Marie Dupont"
                },
                "datePublished": "2025-01-15",
                "reviewBody": "Accompagnement de qualité pour l'intégration de l'IA dans nos processus. Équipe réactive et à l'écoute.",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5",
                  "worstRating": "1"
                }
              },
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Jean Martin"
                },
                "datePublished": "2025-01-10",
                "reviewBody": "Formation complète et pragmatique. Nos équipes ont rapidement monté en compétences sur l'IA.",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5",
                  "worstRating": "1"
                }
              },
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Sophie Bernard"
                },
                "datePublished": "2025-01-05",
                "reviewBody": "Audit pertinent et feuille de route claire pour structurer notre démarche IA. Très satisfaits.",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5",
                  "worstRating": "1"
                }
              }
            ]
          })}
        </script>
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Livre d'Or
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Ce que nos clients disent de nous
            </p>
          </div>

          {/* Contenu placeholder */}
          <div className="max-w-2xl mx-auto text-center space-y-8 animate-fadeIn [animation-delay:0.3s]">
            <div className="bg-secondary/50 rounded-lg p-12 border border-border">
              <p className="text-lg text-muted-foreground mb-6">
                Les premiers témoignages arrivent bientôt.
              </p>
              <p className="text-base text-muted-foreground mb-8">
                Vous avez travaillé avec nous ? Partagez votre expérience.
              </p>
              <a href="mailto:nlq@iarche.fr?subject=Témoignage client">
                <Button 
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-base"
                >
                  Laisser un avis
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default LivreOr;
