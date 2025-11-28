import React from 'react';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { Helmet } from 'react-helmet';

const Accueil = () => {
  return (
    <>
      <Helmet>
        <title>Accueil · IArche · Agence IA pour PME</title>
        <meta name="description" content="Découvrez IArche, agence IA française spécialisée dans le conseil et l'intégration d'intelligence artificielle pour PME. L'IA se construit avec vous." />
      </Helmet>
      
      <BackgroundLayout>
        <></>
      </BackgroundLayout>
    </>
  );
};

export default Accueil;
