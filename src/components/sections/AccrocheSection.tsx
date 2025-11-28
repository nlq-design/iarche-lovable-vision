import React from 'react';
const AccrocheSection = () => {
  return <section className="py-20 md:py-24 px-6 flex flex-col items-center">
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground text-center max-w-3xl leading-relaxed mb-6" style={{
      visibility: 'hidden',
      animation: 'fadeIn 0.8s ease-out 0.1s forwards',
      willChange: 'opacity, transform'
    }}>
        Dirigeant, indépendant ou porteur de projet IA ?
      </h1>
      
      <p className="text-lg md:text-xl text-foreground text-center max-w-2xl leading-relaxed mb-8" style={{
      visibility: 'hidden',
      animation: 'fadeIn 0.8s ease-out 0.2s forwards',
      willChange: 'opacity, transform'
    }}>
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>

      <a href="#services" className="inline-flex items-center gap-2 text-primary hover:text-accent transition-colors duration-300 font-medium text-base group" style={{
      visibility: 'hidden',
      animation: 'fadeIn 0.8s ease-out 0.4s forwards',
      willChange: 'opacity, transform'
    }}>Planifier un rendez-vous

→<span className="transition-transform group-hover:translate-x-1">→</span>
      </a>
    </section>;
};
export default AccrocheSection;