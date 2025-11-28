import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

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
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {services.map((service, index) => (
            <Card 
              key={index}
              className="bg-background border border-border rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{
                visibility: 'hidden',
                animation: `fadeIn 0.8s ease-out ${0.4 + index * 0.1}s forwards`,
                willChange: 'opacity, transform'
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div 
          className="text-center"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.8s forwards',
            willChange: 'opacity, transform'
          }}
        >
          <NavLink 
            to="/services"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group"
          >
            Découvrir nos services
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
