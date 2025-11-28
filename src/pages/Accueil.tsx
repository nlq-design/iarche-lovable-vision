import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ServicesSection from '@/components/sections/ServicesSection';
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

          {/* Hero Section */}
          <section className="py-16 md:py-24 text-center">
            <p 
              className="text-sm text-muted-foreground mb-4"
              style={{ 
                visibility: 'hidden',
                animation: 'fadeIn 0.8s ease-out 0.2s forwards'
              }}
            >
              Agence IA · Bayonne
            </p>
            <h1 
              className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl mx-auto px-6"
              style={{ 
                visibility: 'hidden',
                animation: 'fadeIn 0.8s ease-out 0.4s forwards'
              }}
            >
              Conseil, intégration et accompagnement en intelligence artificielle pour PME.
            </h1>
          </section>

          {/* Sections */}
          <ServicesSection />
          <NewsletterSection />

          <Footer />
        </div>
      </BackgroundLayout>
    </>
  );
};

export default Accueil;
