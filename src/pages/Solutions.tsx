import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import GradientLink from '@/components/ui/GradientLink';
import IArcheLink from '@/components/ui/IArcheLink';

const Solutions = () => {
  const saasSolutions = [
    {
      name: 'Collaboria',
      slug: 'collaboria',
      tagline: 'Plateforme collaborative IA',
      description: 'Multi-LLM, benchmark, maîtrise des usages. Souveraine et conforme.'
    },
    {
      name: 'Chatbot RAG Avancé',
      slug: 'dialogue-plus',
      tagline: 'Chatbot IA connecté à vos documents',
      description: 'RAG avancé, 340+ modèles, benchmark intégré.'
    },
    {
      name: 'ERP Avocat',
      slug: 'lexia',
      tagline: 'ERP pour cabinets d\'avocats',
      description: 'ERP pour cabinet d\'avocats boosté à l\'IA'
    },
    {
      name: 'Datalia',
      slug: 'datalia',
      tagline: 'Extraction de données locales',
      description: 'Prospection par mots-clés et zones. Licence à vie.'
    },
    {
      name: 'Team 5 Connect',
      slug: 'team-5-connect',
      tagline: 'Gestion RH des équipes terrain',
      description: 'Pointage, absences, conformité — BTP et industrie.'
    }
  ];

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Nos solutions · IArche · SaaS IA pour PME</title>
        <meta name="description" content="Solutions IA développées par IArche : Team 5 Connect, Lexia, Dialogue Plus. Ce qu'on conseille, on le construit aussi." />
        <link rel="canonical" href="https://iarche.fr/solutions" />
        <meta property="og:title" content="Nos solutions · IArche · SaaS IA pour PME" />
        <meta property="og:description" content="Solutions IA développées par IArche : Team 5 Connect, Lexia, Dialogue Plus." />
        <meta property="og:url" content="https://iarche.fr/solutions" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Nos solutions
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              <span className="hero-gradient-text">IArche</span> édite des solutions développées à partir de besoins concrets identifiés en accompagnant nos clients.
            </p>
          </div>

          {/* SaaS IArche */}
          <div className="mb-12 pb-8">
            <div className="text-center mb-8 animate-fadeIn [animation-delay:0.3s]">
              <GradientLink href="/contact" className="text-lg">
                Je veux en savoir plus
              </GradientLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {saasSolutions.map((solution, index) => (
                <Card 
                  key={solution.name}
                  className="animate-fadeIn hover:shadow-lg transition-shadow duration-300"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                >
                  <CardHeader>
                    <CardTitle className="text-xl text-foreground">
                      {solution.name}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {solution.tagline}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {solution.description}
                    </p>
                    <IArcheLink href={`/solutions/${solution.slug}`}>
                      En savoir plus
                    </IArcheLink>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-4 animate-fadeIn [animation-delay:1.6s]">
            <p className="text-lg text-foreground mb-6">
              Envie de créer votre propre solution ?
            </p>
            <GradientLink href="/contact" className="text-lg">
              Discuter de votre projet
            </GradientLink>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Solutions;
