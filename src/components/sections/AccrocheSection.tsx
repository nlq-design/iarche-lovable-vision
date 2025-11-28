import React from 'react';

const AccrocheSection = () => {
  return (
    <section className="py-16 md:py-24 px-6 flex flex-col items-center">
      <h1 
        className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-4"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.2s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Dirigeant, indépendant ou porteur de projet IA ?
      </h1>
      
      <p 
        className="text-lg md:text-xl text-foreground text-center max-w-[600px] leading-relaxed mb-6"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.4s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>
      
      <p 
        className="text-sm text-muted-foreground tracking-wider"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.6s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Agence IA · Bayonne · Pays Basque · France
      </p>
    </section>
  );
};

export default AccrocheSection;
