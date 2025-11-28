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
        <link rel="alternate" href="https://iarche.fr/accueil" />
        
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
        
        {/* Schema.org JSON-LD - Organization */}
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
        
        {/* Schema.org JSON-LD - ProfessionalService */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": "IArche",
            "image": "https://iarche.fr/logo-iarche.svg",
            "url": "https://iarche.fr",
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
      <main role="main" className="w-full">
        <HeroSection />
      </main>
    </>
  );
};

export default Index;
