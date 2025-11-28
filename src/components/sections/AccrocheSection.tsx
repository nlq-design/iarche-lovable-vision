import React from 'react';

const AccrocheSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 flex flex-col items-center">
      <h1 
        className="text-xl md:text-2xl text-foreground text-center max-w-2xl leading-relaxed"
        style={{
          visibility: 'hidden',
          animation: 'fadeIn 0.8s ease-out 0.2s forwards',
          willChange: 'opacity, transform'
        }}
      >
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </h1>
    </section>
  );
};

export default AccrocheSection;
