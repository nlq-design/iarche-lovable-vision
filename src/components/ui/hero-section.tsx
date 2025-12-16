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
          <span className="sr-only">IArche · Agence IA Bayonne | Conseil & Intégration PME</span>
        </div>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed invisible animate-fadeIn [animation-delay:0.2s]">
          L'IA se construit avec vous
        </p>
        
        <div className="flex justify-center invisible animate-fadeIn [animation-delay:0.3s]">
          <GradientLink
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
              });
            }}
            className="text-lg"
          >
            <span>Découvrir</span>
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
