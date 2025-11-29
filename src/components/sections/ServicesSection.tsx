import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const services = [
  {
    title: "Audit & Conseil",
    description: "Diagnostic, faisabilité, feuille de route concrète, ROI"
  },
  {
    title: "Développement & Intégration",
    description: "Automatisation, solutions sur-mesure, connexion à vos outils existants"
  },
  {
    title: "Accompagnement & Autonomie",
    description: "Formation, montée en compétences, support durable"
  },
  {
    title: "Conformité & Réglementation",
    description: "AI Act, RGPD, documentation, audit de conformité"
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="pb-12 md:pb-16 bg-background">
      <div className="container mx-auto px-6 lg:px-16">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8">Nos services</h2>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-4 lg:gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <div 
              key={index}
              className="relative rounded-lg p-[2px] gradient-border-animated group animate-fadeIn"
              style={{ 
                visibility: 'hidden',
                animationDelay: `${0.2 + index * 0.1}s`,
                willChange: 'opacity, visibility'
              }}
            >
              <Card 
                className="grid grid-rows-[auto_1fr_auto] bg-card border-0 rounded-lg shadow-sm h-full transition-all duration-300 group-hover:shadow-[0_10px_40px_hsla(var(--primary)/0.15)] group-hover:scale-[1.02] group-hover:-translate-y-0.5"
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
                    className="flex items-center text-sm text-accent hover:text-accent/80 focus:text-accent/80 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded transition-colors group/link"
                  >
                    En savoir plus
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
                  </a>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
