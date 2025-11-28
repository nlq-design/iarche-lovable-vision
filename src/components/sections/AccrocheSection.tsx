import React from 'react';

const AccrocheSection = () => {
  return (
    <section className="py-20 md:py-32 px-6 flex flex-col items-center">
      <h1 
        className="text-3xl md:text-4xl font-semibold text-foreground text-center mb-6 max-w-3xl"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.2s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Dirigeant, indépendant ou porteur de projet IA ?
      </h1>
      
      <p 
        className="text-xl md:text-2xl text-foreground text-center max-w-2xl leading-relaxed mb-8"
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
        className="text-sm text-muted-foreground tracking-widest"
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
