import HeroSection from "@/components/ui/hero-section";
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>IArche | L'IA se construit avec vous | Agence IA Bayonne</title>
        <meta name="description" content="Agence IA à Bayonne. Conseil, intégration et accompagnement pour dirigeants de PME. L'IA se construit avec vous." />
        <meta property="og:title" content="IArche | Agence IA Bayonne" />
        <meta property="og:description" content="L'IA se construit avec vous. Conseil, intégration, accompagnement." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
      </Helmet>
      <main role="main" className="w-full">
        <HeroSection />
      </main>
    </>
  );
};

export default Index;
