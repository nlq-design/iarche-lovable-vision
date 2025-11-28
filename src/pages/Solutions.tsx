import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

const Solutions = () => {
  const saasSolutions = [
    {
      name: 'Team 5 Connect',
      tagline: 'Gestion RH pour le BTP',
      description: 'Plateforme complète de gestion des ressources humaines spécialisée pour les entreprises du bâtiment.',
      status: 'Disponible',
      link: '#'
    },
    {
      name: 'Lexia',
      tagline: 'ERP pour cabinets d\'avocats',
      description: 'Solution de gestion complète pour cabinets juridiques : dossiers, facturation, time tracking.',
      status: 'À venir',
      link: null
    },
    {
      name: 'Collaboration',
      tagline: 'Plateforme collaborative',
      description: 'Espace de travail partagé pour équipes distribuées avec gestion de projets et communication intégrée.',
      status: 'Disponible',
      link: '#'
    },
    {
      name: 'Dialogue Plus',
      tagline: 'Chatbot RAG intelligent',
      description: 'Chatbot conversationnel alimenté par vos documents avec recherche sémantique et génération contextuelle.',
      status: 'Disponible',
      link: '#'
    },
    {
      name: 'Datalia',
      tagline: 'Extraction de données',
      description: 'Extraction automatique et structuration de données depuis documents PDF, images et formulaires.',
      status: 'Disponible',
      link: '#'
    }
  ];

  const customProjects = [
    {
      secteur: 'Logistique',
      realisation: 'Optimisation de tournées',
      description: 'Algorithme d\'optimisation réduisant de 23% les kilomètres parcourus.'
    },
    {
      secteur: 'Retail',
      realisation: 'Recommandation produits',
      description: 'Moteur de recommandation augmentant de 18% le panier moyen.'
    },
    {
      secteur: 'Santé',
      realisation: 'Assistant médical',
      description: 'Chatbot d\'aide au diagnostic pour médecins généralistes.'
    },
    {
      secteur: 'Finance',
      realisation: 'Détection de fraude',
      description: 'Système de scoring réduisant de 34% les faux positifs.'
    },
    {
      secteur: 'Industrie',
      realisation: 'Maintenance prédictive',
      description: 'Modèle prédictif anticipant les pannes machines avec 87% de précision.'
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
      
      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Nos solutions
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Ce qu'on conseille, on le construit aussi
            </p>
          </div>

          {/* SaaS IArche */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-8 invisible animate-fadeIn [animation-delay:0.3s]">
              Solutions SaaS IArche
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {saasSolutions.map((solution, index) => (
                <Card 
                  key={solution.name}
                  className="invisible animate-fadeIn hover:shadow-lg transition-shadow duration-300"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-foreground">
                          {solution.name}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {solution.tagline}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={solution.status === 'Disponible' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {solution.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {solution.description}
                    </p>
                    {solution.link && (
                      <a href={solution.link}>
                        <Button variant="outline" size="sm" className="group">
                          En savoir plus
                          <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Projets sur-mesure */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-8 invisible animate-fadeIn [animation-delay:0.9s]">
              Projets sur-mesure
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customProjects.map((project, index) => (
                <Card 
                  key={index}
                  className="invisible animate-fadeIn hover:shadow-lg transition-shadow duration-300"
                  style={{ animationDelay: `${1.0 + index * 0.1}s` }}
                >
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">
                      {project.secteur}
                    </Badge>
                    <CardTitle className="text-lg text-foreground">
                      {project.realisation}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16 invisible animate-fadeIn [animation-delay:1.6s]">
            <p className="text-lg text-foreground mb-6">
              Envie de créer votre propre solution ?
            </p>
            <Link to="/contact">
              <Button 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-base"
              >
                Discuter de votre projet →
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default Solutions;
