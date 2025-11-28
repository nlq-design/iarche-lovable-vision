import React from 'react';

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
    <section id="exemples" className="py-8 md:py-12 bg-muted">
      <div className="container mx-auto px-6">
          <h2 className="text-lg md:text-xl font-semibold text-primary text-center mb-8 md:mb-12">
            Nos Solutions
          </h2>
        <div className="max-w-4xl mx-auto space-y-6 invisible animate-fadeIn [animation-delay:0.2s]">
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
                  <h3 className="text-base font-semibold text-primary mb-2">
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
      </div>
    </section>
  );
};

export default ExemplesSection;
