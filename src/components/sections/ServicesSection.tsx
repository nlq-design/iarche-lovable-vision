import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const services = [
  {
    title: "Audit & Conseil",
    description: "Comprendre où vous en êtes et définir par où commencer."
  },
  {
    title: "Développement & Intégration",
    description: "Construire et déployer des solutions qui marchent dans votre contexte."
  },
  {
    title: "Accompagnement & Autonomie",
    description: "Rendre vos équipes capables de continuer sans nous."
  },
  {
    title: "Conformité & Réglementation",
    description: "S'assurer que vos projets IA respectent les règles du jeu."
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="pb-12 md:pb-16 bg-background">
      <div className="container mx-auto px-6 lg:px-16">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8">Nos services</h2>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-4 lg:gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="grid grid-rows-[auto_1fr_auto] bg-card border border-border rounded-lg shadow-sm hover:border-accent hover:shadow-lg transition-all duration-300 invisible animate-fadeIn"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold leading-none tracking-tight md:text-xl hero-gradient-text">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {service.description}
                </p>
              </CardContent>
              <CardFooter>
                <a
                  href="/services"
                  className="flex items-center text-sm text-accent hover:text-accent/80 focus:text-accent/80 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded transition-colors group"
                >
                  En savoir plus
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
