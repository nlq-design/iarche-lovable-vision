import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccrocheSection from '@/components/sections/AccrocheSection';
import ServicesSection from '@/components/sections/ServicesSection';
import PresentationSection from '@/components/sections/PresentationSection';
import ExemplesSection from '@/components/sections/ExemplesSection';
import NewsletterSection from '@/components/sections/NewsletterSection';
import { Helmet } from 'react-helmet';

const Accueil = () => {
  return (
    <>
      <Helmet>
        <title>IArche · Agence IA pour PME · Conseil et intégration</title>
        <meta name="description" content="IArche accompagne les PME françaises dans l'intégration de l'intelligence artificielle : audit, développement, accompagnement et conformité. De l'audit à l'autonomie." />
        <meta name="keywords" content="agence IA, conseil IA PME, intégration IA entreprise, intelligence artificielle, Bayonne" />
      </Helmet>
      
      <BackgroundLayout>
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />

          <AccrocheSection />

          <ServicesSection />

          <PresentationSection />

          <ExemplesSection />

          <NewsletterSection />

          <Footer />
        </div>
      </BackgroundLayout>
    </>
  );
};

export default Accueil;
