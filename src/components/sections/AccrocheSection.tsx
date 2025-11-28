import React from 'react';
const AccrocheSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 flex flex-col items-center">
      <h2 className="text-2xl md:text-3xl font-semibold text-primary text-center max-w-3xl leading-relaxed mb-6 invisible animate-fadeIn [animation-delay:0.1s]">
        Dirigeant, indépendant ou porteur de projet IA ?
      </h2>
      
      <p className="text-lg md:text-xl text-foreground text-center max-w-2xl leading-relaxed mb-8 invisible animate-fadeIn [animation-delay:0.2s]">
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>

      <a 
        href="#services" 
        onClick={(e) => {
          e.preventDefault();
          const servicesSection = document.getElementById('services');
          servicesSection?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="inline-flex items-center gap-2 text-primary hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors duration-300 font-medium text-base group invisible animate-fadeIn [animation-delay:0.4s] cursor-pointer"
      >
        Planifier un rendez-vous
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </a>
    </section>
  );
};
export default AccrocheSection;