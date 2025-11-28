import React from 'react';
import { NavLink } from '@/components/NavLink';
import { ArrowRight } from 'lucide-react';

const exemples = [
  { secteur: "Grande distribution", realisation: "Analyse pricing et optimisation marges" },
  { secteur: "Transport & Logistique", realisation: "Automatisation planification tournées" },
  { secteur: "Bureau d'études", realisation: "Agent IA réponse appels d'offres" },
  { secteur: "Association nationale", realisation: "Plateforme gestion vie associative" },
  { secteur: "Garage automobile", realisation: "Chatbot vocal prise de rendez-vous" }
];

const ExemplesSection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-6">
        <h2 
          className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-8"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards',
            willChange: 'opacity, transform'
          }}
        >
          Ce qu'on construit
        </h2>

        <div 
          className="flex flex-wrap justify-center gap-4 max-w-[900px] mx-auto mb-8"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.4s forwards',
            willChange: 'opacity, transform'
          }}
        >
          {exemples.map((exemple, index) => (
            <div 
              key={index}
              className="bg-transparent border border-border rounded-lg px-4 py-3 text-sm text-foreground"
            >
              <span className="font-semibold">{exemple.secteur}</span>
              <span className="text-muted-foreground"> · </span>
              <span>{exemple.realisation}</span>
            </div>
          ))}
        </div>

        <div 
          className="text-center"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.6s forwards',
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

export default ExemplesSection;
