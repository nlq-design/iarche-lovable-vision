import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccrocheSection from '@/components/sections/AccrocheSection';
import ServicesSection from '@/components/sections/ServicesSection';
import PresentationSection from '@/components/sections/PresentationSection';
import ExemplesSection from '@/components/sections/ExemplesSection';
import SolutionsCTASection from '@/components/sections/SolutionsCTASection';
import NewsletterSection from '@/components/sections/NewsletterSection';
import { Helmet } from 'react-helmet';

const Accueil = () => {
  return (
    <>
      <Helmet>
        <html lang="fr" />
        <title>Accueil · IArche · Agence IA Bayonne & Sud-Ouest</title>
        <meta name="description" content="Agence IA à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME. Sud-Ouest et toute la France." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://iarche.fr/" />
        
        {/* Open Graph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="IArche · Agence IA Bayonne & Sud-Ouest" />
        <meta property="og:description" content="IArche accompagne les PME du Sud-Ouest (Bayonne, Biarritz, Pau, Bordeaux) dans l'intégration de l'intelligence artificielle : audit, développement, accompagnement et conformité." />
        <meta property="og:url" content="https://iarche.fr/accueil" />
        <meta property="og:locale" content="fr_FR" />
        
        {/* Structured Data - ProfessionalService uniquement sur /accueil */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "IArche",
            "image": "https://iarche.fr/logo-iarche.svg",
            "url": "https://iarche.fr/accueil",
            "email": "nlq@iarche.fr",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "addressRegion": "Nouvelle-Aquitaine",
              "addressCountry": "FR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "43.4929",
              "longitude": "-1.4748"
            },
            "priceRange": "€€",
            "areaServed": [
              {
                "@type": "Country",
                "name": "France"
              },
              {
                "@type": "City",
                "name": "Bayonne"
              },
              {
                "@type": "City",
                "name": "Biarritz"
              },
              {
                "@type": "City",
                "name": "Pau"
              },
              {
                "@type": "City",
                "name": "Bordeaux"
              },
              {
                "@type": "City",
                "name": "Dax"
              },
              {
                "@type": "City",
                "name": "Tarbes"
              },
              {
                "@type": "City",
                "name": "Lourdes"
              },
              {
                "@type": "City",
                "name": "Mont-de-Marsan"
              },
              {
                "@type": "City",
                "name": "Oloron-Sainte-Marie"
              },
              {
                "@type": "City",
                "name": "Lescar"
              }
            ],
            "description": "Agence IA fondée à Bayonne accompagnant les dirigeants de PME du Sud-Ouest (Bayonne, Biarritz, Pau, Bordeaux, Dax et région) dans l'intégration concrète de l'intelligence artificielle"
          })}
        </script>
      </Helmet>
      
      <BackgroundLayout>
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

          <main>
            <AccrocheSection />

          <ServicesSection />

          <PresentationSection />

            <ExemplesSection />

            <SolutionsCTASection />

            <NewsletterSection />
          </main>

          <Footer />
        </div>
      </BackgroundLayout>
    </>
  );
};

export default Accueil;
