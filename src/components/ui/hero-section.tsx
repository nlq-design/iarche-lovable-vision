import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { ChevronDown } from 'lucide-react';
import { useAnimationPause } from '@/hooks/useAnimationPause';
import { useCTATracking } from '@/hooks/useCTATracking';
import { Particles, BtnPrimary } from '@/components/brand';
import { HeroEyebrow } from '@/components/brand/Eyebrow';
import ChatbotDialog from './ChatbotDialog';

const HeroSection = () => {
  const heroRef = useAnimationPause<HTMLDivElement>();
  const { trackCTAClick } = useCTATracking();
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <section
      ref={heroRef}
      className="sec-dark relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <Particles />

      <div className="relative z-[1] mx-auto w-full max-w-[1180px] px-7 md:px-11 py-24 text-center">
        {/* Eyebrow pilule */}
        <div className="mb-10 flex justify-center animate-fadeIn">
          <HeroEyebrow>Architecte IA · Bayonne · France</HeroEyebrow>
        </div>

        {/* Logo officiel (blanc sur sombre) — LCP candidate */}
        <div className="mb-12 md:mb-16 animate-fadeIn flex flex-col items-center">
          <Logo variant="white" size="xl" priority />
          <span className="sr-only">IArche · L'IA se construit avec vous</span>
        </div>

        <h1 className="mx-auto mb-6 max-w-[20ch] text-[clamp(28px,4.5vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em] text-[hsl(var(--cream))] animate-fadeIn">
          L'IA <em className="not-italic font-medium text-[hsl(var(--accent-flame))]">se construit</em> avec vous.
        </h1>

        <p className="mx-auto mb-10 max-w-[52ch] text-base md:text-lg leading-relaxed text-[hsl(var(--cream)/0.72)] animate-fadeIn">
          Votre architecte IA, basé à Bayonne. On conçoit et on intègre l'IA dans votre métier —
          de l'audit jusqu'à votre autonomie. Vous gardez la main.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-14 invisible animate-fadeIn [animation-delay:0.3s]">
          <BtnPrimary to="/solutions" onClick={() => trackCTAClick('decouvrir_solutions', 'hero_section')}>
            Découvrir nos solutions
          </BtnPrimary>
          <Link
            to="/rendez-vous/premier-echange"
            onClick={() => trackCTAClick('premier_echange', 'hero_section')}
            className="group inline-flex items-center gap-2 text-[15px] font-medium text-[hsl(var(--cream)/0.82)] hover:text-[hsl(var(--accent-soft))] transition-colors"
          >
            Premier échange
            <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Indicateur de scroll */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          aria-label="Faire défiler vers le bas"
          className="mx-auto flex text-[hsl(var(--cream)/0.6)] hover:text-[hsl(var(--accent-soft))] transition-colors invisible animate-fadeIn [animation-delay:0.4s]"
        >
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </button>
      </div>

      {/* Ancrage géographique + question */}
      <div className="absolute bottom-12 left-0 right-0 text-center z-[1] invisible animate-fadeIn [animation-delay:0.5s]">
        <p className="text-sm mb-3 text-[hsl(var(--cream)/0.6)]">
          Bayonne · France
          <span className="hidden md:inline">
            {' · '}
            <a
              href="mailto:nlq@iarche.fr"
              className="hover:text-[hsl(var(--accent-soft))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-vivid))] rounded transition-colors"
            >
              nlq@iarche.fr
            </a>
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setChatbotOpen(true);
            trackCTAClick('une_question', 'hero_section');
          }}
          className="inline-flex items-center gap-2 text-[15px] font-medium text-[hsl(var(--accent-soft))] hover:text-[hsl(var(--cream))] transition-colors cursor-pointer"
        >
          Une question ?
        </button>

        <ChatbotDialog open={chatbotOpen} onOpenChange={setChatbotOpen} />
      </div>
    </section>
  );
};

export default HeroSection;
