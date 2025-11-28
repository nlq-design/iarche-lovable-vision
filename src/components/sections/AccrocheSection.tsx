import React from 'react';

const AccrocheSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 flex flex-col items-center">
      <h1 
        className="text-3xl md:text-4xl font-semibold text-foreground text-center mb-6 max-w-3xl"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.2s forwards',
          willChange: 'opacity, transform'
        }}
      >
        <span className="hero-gradient-text">IArche</span>, votre agence IA pour PME à Bayonne
      </h1>
      
      <p 
        className="text-xl md:text-2xl text-foreground text-center max-w-2xl leading-relaxed"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.4s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>
    </section>
  );
};

export default AccrocheSection;
