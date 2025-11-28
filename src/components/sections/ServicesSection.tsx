import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const services = [
  {
    title: "Audit & Conseil",
    description: "Diagnostic maturité IA, faisabilité, ROI, roadmap stratégique"
  },
  {
    title: "Développement & Intégration",
    description: "Chatbots, automatisation, RAG, API, solutions sur-mesure"
  },
  {
    title: "Accompagnement & Autonomie",
    description: "Formation équipes, coaching, montée en compétences, support"
  },
  {
    title: "Conformité & Réglementation",
    description: "AI Act, RGPD, documentation, audit juridique IA"
  }
];

const ServicesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="grid grid-rows-[auto_1fr] bg-card border border-border rounded-lg hover:border-accent hover:shadow-lg transition-all duration-300"
              style={{
                visibility: 'hidden',
                animation: `fadeIn 0.8s ease-out ${0.4 + index * 0.1}s forwards`,
                willChange: 'opacity, transform'
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground leading-tight md:text-xl">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
