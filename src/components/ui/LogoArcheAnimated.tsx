import { useEffect } from 'react';

interface LogoArcheAnimatedProps {
  className?: string;
}

const LogoArcheAnimated = ({ className = '' }: LogoArcheAnimatedProps) => {
  useEffect(() => {
    // Calcul précis des longueurs de path pour animation fluide
    document.querySelectorAll('.canalisation-line-article').forEach(path => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Déclenchement de l'animation après court délai
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 6s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 300);
    });
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Logo IArche avec gradient animé */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold hero-gradient-text invisible animate-fadeIn [animation-delay:0.1s]">
          IArche
        </h2>
      </div>

      {/* Lignes SVG animées type canalisation - Gradients Bleu Nuit ↔ Terracotta */}
      <div className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-[-1]">
        <svg className="absolute w-full h-full" viewBox="0 0 177 80" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="canalisationGradientArticle1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path 
            className="canalisation-line-article" 
            d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 38C51.5359 39.1046 50.6405 40 49.5359 40L0 40"
            fill="none"
            stroke="url(#canalisationGradientArticle1)"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
        
        <svg className="absolute w-full h-full" viewBox="0 0 176 40" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="canalisationGradientArticle2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
          </defs>
          <path 
            className="canalisation-line-article" 
            d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 37C124.464 38.1046 125.36 39 126.464 39L176 39"
            fill="none"
            stroke="url(#canalisationGradientArticle2)"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
};

export default LogoArcheAnimated;
