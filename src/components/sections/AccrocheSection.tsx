import React from 'react';
import { Link } from 'react-router-dom';
import { useCTATracking } from '@/hooks/useCTATracking';

const AccrocheSection = () => {
  const { trackCTAClick } = useCTATracking();
  return (
    <section className="py-20 md:py-24 px-6 flex flex-col items-center">
      <h2 className="text-2xl md:text-3xl font-semibold text-primary text-center max-w-3xl leading-relaxed mb-6 invisible animate-fadeIn [animation-delay:0.1s]">
        Dirigeant, indépendant ou porteur de projet IA ?
      </h2>
      
      <p className="text-lg md:text-xl text-foreground text-center max-w-2xl leading-relaxed invisible animate-fadeIn [animation-delay:0.2s]">
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>
    </section>
  );
};
export default AccrocheSection;