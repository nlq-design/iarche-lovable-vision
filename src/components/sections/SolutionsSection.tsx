import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

const solutions = [
  {
    name: "Team 5 Connect",
    status: "Disponible",
    description: "Gestion RH + suivi chantiers BTP"
  },
  {
    name: "Lexia",
    status: "À venir",
    description: "ERP avocats, CLM, facturation"
  },
  {
    name: "Collaboration",
    status: "Disponible",
    description: "Plateforme collaborative augmentée"
  },
  {
    name: "Dialogue Plus",
    status: "Disponible",
    description: "Chatbot RAG sur données métier"
  }
];

const SolutionsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-4xl font-semibold text-foreground mb-4"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.2s forwards'
            }}
          >
            Nos solutions
          </h2>
          <p 
            className="text-lg text-muted-foreground"
            style={{ 
              visibility: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.4s forwards'
            }}
          >
            Ce qu'on conseille, on le construit aussi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {solutions.map((solution, index) => (
            <Card 
              key={index}
              className="bg-background border border-border rounded-xl hover:shadow-lg transition-all duration-300"
              style={{
                visibility: 'hidden',
                animation: `fadeIn 0.8s ease-out ${0.6 + index * 0.1}s forwards`
              }}
            >
              <CardHeader className="pb-3">
                <Badge 
                  variant={solution.status === "Disponible" ? "default" : "secondary"}
                  className={solution.status === "Disponible" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                >
                  {solution.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base font-semibold text-foreground mb-2">
                  {solution.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {solution.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div 
          className="text-center"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 1s forwards'
          }}
        >
          <NavLink 
            to="/solutions"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group"
          >
            Voir toutes nos solutions
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
