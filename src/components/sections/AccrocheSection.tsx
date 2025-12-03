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
      
      <p className="text-lg md:text-xl text-foreground text-center max-w-2xl leading-relaxed mb-8 invisible animate-fadeIn [animation-delay:0.2s]">
        Vous savez que l'IA peut transformer votre quotidien,<br />
        mais par où commencer concrètement ?
      </p>

      <Link 
        to="/rendez-vous/premier-echange"
        onClick={() => trackCTAClick('premier_echange', 'accroche_section')}
        className="inline-flex items-center gap-2 text-primary hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-colors duration-300 font-medium text-base group invisible animate-fadeIn [animation-delay:0.4s] cursor-pointer"
      >
        Premier échange
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </section>
  );
};
export default AccrocheSection;