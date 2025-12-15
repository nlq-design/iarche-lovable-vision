import React, { useState } from 'react';
import GradientLink from '@/components/ui/GradientLink';
import GradientTitle from '@/components/ui/GradientTitle';
import AnimatedArcs from '@/components/ui/AnimatedArcs';
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
      {/* Arcs SVG animés - nouvelle identité v4.0 */}
      <AnimatedArcs />

      <div className="container text-center z-10 relative px-6 py-20">
        <div className="mb-20 md:mb-28 invisible animate-fadeIn [animation-delay:0.1s]">
          <GradientTitle size="xl" className="mb-0">
            <span>IArche</span>
            <span className="sr-only">· Agence IA Bayonne | Conseil & Intégration PME</span>
          </GradientTitle>
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
