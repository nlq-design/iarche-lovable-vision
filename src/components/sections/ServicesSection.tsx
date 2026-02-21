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
    description: "Des solutions sur-mesure qui s'intègrent à vos outils existants."
  },
  {
    title: "Accompagnement & Autonomie",
    description: "On rend vos équipes autonomes. L'IA évolue, votre entreprise aussi."
  },
  {
    title: "Conformité & Réglementation",
    description: "AI Act, RGPD : intégrer l'IA en restant conforme."
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="pb-12 md:pb-16 bg-background">
      <div className="container mx-auto px-6 lg:px-16">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8">Nos services</h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="relative grid grid-rows-[auto_1fr_auto] bg-card border border-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 invisible animate-fadeIn overflow-hidden"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              {/* Bordure gradient à gauche */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                style={{ background: 'linear-gradient(180deg, #1A2B4A 0%, #B04A32 100%)' }}
              />
              
              <CardHeader className="pl-5">
                <div className="flex items-center gap-2">
                  {/* Badge gradient */}
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%)' }}
                  />
                  <CardTitle className="text-lg font-semibold leading-none tracking-tight md:text-xl hero-gradient-text">
                    {service.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pl-5">
                <p className="text-muted-foreground">
                  {service.description}
                </p>
              </CardContent>
              <CardFooter className="pl-5">
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
