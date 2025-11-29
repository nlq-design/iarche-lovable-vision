import React, { useEffect } from 'react';
import GradientLink from '@/components/ui/GradientLink';
import { ChevronDown } from 'lucide-react';
import { useAnimationPause } from '@/hooks/useAnimationPause';

const HeroSection = () => {
  const heroRef = useAnimationPause<HTMLDivElement>();
  
  useEffect(() => {
    // Calcul précis des longueurs de path pour animation fluide
    document.querySelectorAll('.canalisation-line').forEach(path => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Déclenchement de l'animation après court délai
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 6s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 500);
    });
  }, []);

  return (
    <div ref={heroRef} className="min-h-screen flex items-center justify-center relative">
        {/* Rectangles décoratifs (Construction) - Uniquement sur / */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" role="presentation" aria-hidden="true">
          <div className="absolute top-20 left-10 w-32 h-32 border border-border/30 rounded-lg animate-constructionFade" />
          <div className="absolute bottom-32 right-20 w-24 h-24 border border-border/30 rounded-lg animate-constructionFade [animation-delay:1s]" />
          <div className="absolute top-1/2 right-10 w-40 h-40 border border-border/30 rounded-lg animate-constructionFade [animation-delay:2s]" />
          <div className="absolute bottom-20 left-1/4 w-28 h-28 border border-border/30 rounded-lg animate-constructionFade [animation-delay:3s]" />
        </div>

        <div className="container text-center z-10 relative px-6 py-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-semibold m-0 relative z-20 mb-20 md:mb-28 invisible animate-fadeIn [animation-delay:0.1s]">
            <span className="hero-gradient-text">IArche</span>
            <span className="sr-only">· Agence IA Bayonne | Conseil & Intégration PME</span>
          </h1>
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

        {/* Lignes SVG animées type canalisation - Gradients Bleu Nuit ↔ Terracotta */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[1]">
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="canalisationGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              className="canalisation-line" 
              d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 56C51.5359 57.1046 50.6405 58 49.5359 58L0 58"
            />
          </svg>
          
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 176 59" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="canalisationGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <path 
              className="canalisation-line" 
              d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 56C124.464 57.1046 125.36 58 126.464 58L176 58"
            />
          </svg>
        </div>

        <style>
          {`
            .canalisation-line {
              fill: none;
              stroke-width: 2;
              opacity: 0.5;
            }
            
            .canalisation-line:nth-child(1) {
              stroke: url(#canalisationGradient1);
            }
            
            .canalisation-line:nth-child(2) {
              stroke: url(#canalisationGradient2);
            }
          `}
        </style>

        {/* Ancrage géographique */}
        <div className="absolute bottom-16 left-0 right-0 text-center z-10 invisible animate-fadeIn [animation-delay:0.4s]">
          <p className="text-sm mb-3 text-text-subtle">
            Bayonne · France · <a 
              href="mailto:nlq@iarche.fr" 
              className="hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded transition-all duration-200"
            >
              nlq@iarche.fr
            </a>
          </p>
          <GradientLink
            onClick={() => {
              const footer = document.querySelector('footer');
              footer?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 cursor-pointer"
          >
            Une question ?
          </GradientLink>
        </div>
      </div>
  );
};

export default HeroSection;
