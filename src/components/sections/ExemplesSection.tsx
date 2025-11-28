import React from 'react';
import { NavLink } from '@/components/NavLink';
import { ArrowRight } from 'lucide-react';

const exemples = [
  { 
    secteur: "Grande distribution", 
    realisation: "Analyse pricing et optimisation marges",
    description: "Automatisation de l'analyse concurrentielle et optimisation dynamique des marges produits"
  },
  { 
    secteur: "Transport & Logistique", 
    realisation: "Automatisation planification tournées",
    description: "Système intelligent de planification et optimisation des itinéraires de livraison"
  },
  { 
    secteur: "Bureau d'études", 
    realisation: "Agent IA réponse appels d'offres",
    description: "Assistant IA pour l'analyse et la génération automatique de réponses aux appels d'offres"
  },
  { 
    secteur: "Association nationale", 
    realisation: "Plateforme gestion vie associative",
    description: "Solution complète de gestion des adhésions, événements et communications internes"
  },
  { 
    secteur: "Garage automobile", 
    realisation: "Chatbot vocal prise de rendez-vous",
    description: "Assistant vocal intelligent pour la prise de rendez-vous et gestion de la relation client"
  }
];

const ExemplesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-muted">
      <div className="container mx-auto px-6">
        <h2 
          className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-12"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards',
            willChange: 'opacity, transform'
          }}
        >
          Quelques exemples de sur-mesure
        </h2>

        <div 
          className="max-w-4xl mx-auto space-y-6 mb-12"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.4s forwards',
            willChange: 'opacity, transform'
          }}
        >
          {exemples.map((exemple, index) => (
            <div 
              key={index}
              className="bg-background border border-border rounded-lg p-6 hover:border-accent transition-colors duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                      {exemple.secteur}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {exemple.realisation}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exemple.description}
                  </p>
                </div>
              </div>
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
            to="/solutions"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium text-sm transition-colors group"
          >
            Voir tous nos projets
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default ExemplesSection;
