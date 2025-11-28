import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
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
        <title>IArche · Agence IA pour PME · Conseil et intégration</title>
        <meta name="description" content="IArche accompagne les PME françaises dans l'intégration de l'intelligence artificielle : audit, développement, accompagnement et conformité. De l'audit à l'autonomie." />
        <meta name="keywords" content="agence IA, conseil IA PME, intégration IA entreprise, intelligence artificielle, Bayonne" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://iarche.fr/accueil" />
        
        {/* Open Graph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="IArche · Agence IA pour PME · Conseil et intégration" />
        <meta property="og:description" content="IArche accompagne les PME françaises dans l'intégration de l'intelligence artificielle : audit, développement, accompagnement et conformité." />
        <meta property="og:url" content="https://iarche.fr/accueil" />
        <meta property="og:locale" content="fr_FR" />
        
        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo-iarche.svg",
            "description": "Agence IA spécialisée dans l'accompagnement des PME françaises pour l'intégration de l'intelligence artificielle",
            "email": "nlq@iarche.fr",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "addressCountry": "FR"
            },
            "areaServed": "FR",
            "serviceType": ["Conseil IA", "Audit IA", "Développement IA", "Formation IA", "Conformité IA"]
          })}
        </script>
        
        {/* Structured Data - LocalBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "IArche",
            "image": "https://iarche.fr/logo-iarche.svg",
            "url": "https://iarche.fr",
            "telephone": "",
            "email": "nlq@iarche.fr",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "addressRegion": "Nouvelle-Aquitaine",
              "addressCountry": "FR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "43.4833",
              "longitude": "-1.4833"
            },
            "priceRange": "€€",
            "areaServed": {
              "@type": "Country",
              "name": "France"
            },
            "description": "Agence IA fondée à Bayonne accompagnant les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle"
          })}
        </script>
      </Helmet>
      
      <BackgroundLayout>
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

          <div className="container mx-auto px-6">
            <BreadcrumbNav items={[{ label: 'Accueil' }]} />
          </div>

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
