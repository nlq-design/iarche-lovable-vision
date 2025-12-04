import HeroSection from "@/components/ui/hero-section";
import Header from "@/components/layout/Header";
import AccrocheSection from "@/components/sections/AccrocheSection";
import ServicesSection from "@/components/sections/ServicesSection";
import PresentationSection from "@/components/sections/PresentationSection";
import ExemplesSection from "@/components/sections/ExemplesSection";
import SolutionsCTASection from "@/components/sections/SolutionsCTASection";
import NewsletterSection from "@/components/sections/NewsletterSection";
import Footer from "@/components/layout/Footer";
import BackgroundLayout from "@/components/layouts/BackgroundLayout";
import { Helmet } from "react-helmet";
import { useEffect, useState } from "react";

const Index = () => {
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = window.innerHeight * 0.8;
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      setShowHeader(currentScroll > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative">
      {/* Header sticky avec apparition au scroll - HORS du BackgroundLayout */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <Header />
      </div>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/" />
        {/* Primary Meta Tags */}
        <title>IArche · Agence IA Bayonne | Conseil & Intégration PME</title>
        <meta name="description" content="Agence IA à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME. Sud-Ouest et toute la France." />
        <link rel="canonical" href="https://iarche.fr/" />
        
        {/* Geo Tags - Local SEO */}
        <meta name="geo.region" content="FR-64" />
        <meta name="geo.placename" content="Bayonne" />
        <meta name="geo.position" content="43.4929;-1.4748" />
        <meta name="ICBM" content="43.4929, -1.4748" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        <meta property="og:title" content="IArche · Agence IA Bayonne | Conseil & Intégration PME" />
        <meta property="og:description" content="Agence IA à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME. Sud-Ouest et toute la France." />
        <meta property="og:url" content="https://iarche.fr/" />
        <meta property="og:image" content="https://iarche.fr/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IArche · Agence IA Bayonne | Conseil & Intégration PME" />
        <meta name="twitter:description" content="Agence IA à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME." />
        <meta name="twitter:image" content="https://iarche.fr/og-image.png" />
        
        {/* Schema.org JSON-LD - Organization + LocalBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "alternateName": "Collabor IA",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo-iarche.svg",
            "description": "Agence IA basée à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : audit, développement, accompagnement, conformité. Engagés localement, nous intervenons aussi partout en France.",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "addressRegion": "Nouvelle-Aquitaine",
              "postalCode": "64100",
              "addressCountry": "FR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "43.4929",
              "longitude": "-1.4748"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "nlq@iarche.fr",
              "contactType": "customer service",
              "availableLanguage": ["French"]
            },
            "sameAs": [
              "https://www.linkedin.com/company/iarche"
            ],
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
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Un seul BackgroundLayout englobant tout */}
      <BackgroundLayout>
        {/* Header sticky avec apparition au scroll */}
        <div 
          className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${
            showHeader ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <Header />
        </div>
        
        <HeroSection />
        <AccrocheSection />
        <ServicesSection />
        <PresentationSection />
        <ExemplesSection />
        <SolutionsCTASection />
        <NewsletterSection />
        <Footer />
      </BackgroundLayout>
    </div>
  );
};

export default Index;
