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
import GradientDivider from "@/components/ui/GradientDivider";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/" />
        {/* Primary Meta Tags */}
        <title>IArche · Architecte IA Bayonne | Conseil & Intégration PME</title>
        <meta name="description" content="IArche est votre architecte IA à Bayonne. Nous concevons et intégrons des solutions IA souveraines pour les PME françaises." />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content="architecte IA, intelligence artificielle, PME, Bayonne, Pays Basque, conseil IA, intégration IA" />
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
        <meta property="og:title" content="IArche · Architecte IA Bayonne | Conseil & Intégration PME" />
        <meta property="og:description" content="Architecte IA basé à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME. Sud-Ouest et toute la France." />
        <meta property="og:url" content="https://iarche.fr/" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IArche · Architecte IA Bayonne | Conseil & Intégration PME" />
        <meta name="twitter:description" content="Architecte IA basé à Bayonne. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME." />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />
        
        {/* Schema.org JSON-LD - Organization + LocalBusiness */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "alternateName": "Collabor IA",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo-iarche.svg",
            "description": "Architecte IA basé à Bayonne. On accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle : audit, développement, accompagnement, conformité. Engagés localement, nous intervenons aussi partout en France.",
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

      {/* Header en position normale */}
      <Header />

      {/* BackgroundLayout démarre après le header */}
      <BackgroundLayout>
        <HeroSection />
        <AccrocheSection />
        <ServicesSection />
        <GradientDivider height="sm" showLogo={true} />
        <PresentationSection />
        <ExemplesSection />
        <SolutionsCTASection />
        <NewsletterSection />
        <Footer />
      </BackgroundLayout>
    </>
  );
};

export default Index;