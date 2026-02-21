import React, { useState } from 'react';
import GradientLink from '@/components/ui/GradientLink';
import Logo from '@/components/ui/Logo';
import { ChevronDown } from 'lucide-react';
import { useAnimationPause } from '@/hooks/useAnimationPause';
import { useCTATracking } from '@/hooks/useCTATracking';
import ChatbotDialog from './ChatbotDialog';

const HeroSection = () => {
  const heroRef = useAnimationPause<HTMLDivElement>();
  const { trackCTAClick } = useCTATracking();
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <div ref={heroRef} className="min-h-screen flex items-center justify-center relative">
      <div className="container text-center z-10 relative px-6 py-20">
        {/* Logo officiel SVG + Arc décoratif */}
        <div className="mb-20 md:mb-28 invisible animate-fadeIn [animation-delay:0.1s] flex flex-col items-center">
          <Logo variant="main" size="xl" priority />
          <span className="sr-only">IArche · Architecte IA Bayonne | Conseil & Intégration PME</span>
        </div>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed invisible animate-fadeIn [animation-delay:0.2s]">
          Votre Architecte IA. De l'audit à l'autonomie.
        </p>
        
        {/* CTA Principal - Above the fold */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 invisible animate-fadeIn [animation-delay:0.3s]">
          <GradientLink
            to="/solutions"
            onClick={() => trackCTAClick('decouvrir_solutions', 'hero_section')}
            className="text-lg px-6 py-3 bg-primary/10 rounded-full border border-primary/20 hover:bg-primary/20 transition-all duration-300"
          >
            Découvrir nos solutions
          </GradientLink>
          <GradientLink
            to="/rendez-vous/premier-echange"
            onClick={() => trackCTAClick('premier_echange', 'hero_section')}
            className="text-base"
          >
            Premier échange
          </GradientLink>
        </div>
        
        <div className="flex justify-center invisible animate-fadeIn [animation-delay:0.4s]">
          <GradientLink
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
              });
            }}
            className="text-sm text-muted-foreground"
          >
            <ChevronDown className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-1" />
          </GradientLink>
        </div>
      </div>

      {/* Ancrage géographique */}
      <div className="absolute bottom-16 left-0 right-0 text-center z-10 invisible animate-fadeIn [animation-delay:0.4s]">
        <p className="text-sm mb-3 text-text-subtle">
          Bayonne · France<span className="hidden md:inline"> · <a 
            href="mailto:nlq@iarche.fr" 
            className="hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded transition-all duration-200"
          >
            nlq@iarche.fr
          </a></span>
        </p>
        <GradientLink
          onClick={() => {
            setChatbotOpen(true);
            trackCTAClick('une_question', 'hero_section');
          }}
          className="inline-flex items-center gap-2 cursor-pointer"
        >
          Une question ?
        </GradientLink>
        
        <ChatbotDialog open={chatbotOpen} onOpenChange={setChatbotOpen} />
      </div>
    </div>
  );
};

export default HeroSection;
