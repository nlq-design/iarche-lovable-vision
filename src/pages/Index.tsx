import HeroSection from "@/components/ui/hero-section";
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>IArche · Agence IA pour PME | Conseil & Intégration</title>
        <meta name="description" content="Agence IA française. Conseil, intégration et accompagnement en intelligence artificielle pour dirigeants de PME. L'IA se construit avec vous." />
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
        <meta property="og:title" content="IArche · Agence IA pour PME" />
        <meta property="og:description" content="Conseil, intégration et accompagnement en intelligence artificielle. L'IA se construit avec vous." />
        <meta property="og:url" content="https://iarche.fr/" />
        <meta property="og:image" content="https://iarche.fr/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IArche · Agence IA pour PME" />
        <meta name="twitter:description" content="Conseil, intégration et accompagnement en intelligence artificielle pour PME." />
        <meta name="twitter:image" content="https://iarche.fr/og-image.png" />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "description": "Agence IA française - Conseil, intégration et accompagnement en intelligence artificielle pour PME",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo.png",
            "email": "nlq@iarche.fr",
            "areaServed": {
              "@type": "Country",
              "name": "France"
            },
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bayonne",
              "postalCode": "64100",
              "addressRegion": "Nouvelle-Aquitaine",
              "addressCountry": "FR"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "nlq@iarche.fr",
              "contactType": "customer service",
              "availableLanguage": "French"
            },
            "sameAs": []
          })}
        </script>
      </Helmet>
      <main role="main" className="w-full">
        <HeroSection />
      </main>
    </>
  );
};

export default Index;
