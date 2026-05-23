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
    <div ref={heroRef} className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient lights — IArche tokens only, light mode */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 motion-reduce:hidden"
      >
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Dotted grid — very subtle, charte-safe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="container text-center z-10 relative px-6 py-20">
        {/* Badge "Nouveau" — outline charte */}
        <div className="mb-10 flex justify-center animate-fadeIn">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-xs font-medium tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Nouveau · Cockpit IArche disponible
          </span>
        </div>

        {/* Logo officiel SVG + Arc décoratif - LCP candidate, painted immediately */}
        <div className="mb-20 md:mb-28 animate-fadeIn flex flex-col items-center">
          <Logo variant="main" size="xl" priority />
          <span className="sr-only">IArche · L'IA se construit avec vous</span>
        </div>
        
        <h1 className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed animate-fadeIn">
          L'IA se construit avec vous.
        </h1>
        
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
