import { useEffect } from 'react';
import Logo from './Logo';

interface LogoArcheAnimatedProps {
  className?: string;
  /** Utiliser le nouveau logo SVG ou le texte gradient */
  useSvgLogo?: boolean;
}

/**
 * Logo IArche animé avec arcs décoratifs (v4.0)
 * 
 * Remplace les anciennes lignes "canalisation" par des arcs
 */
const LogoArcheAnimated = ({ className = '', useSvgLogo = true }: LogoArcheAnimatedProps) => {
  useEffect(() => {
    // Animation des arcs avec stroke-dashoffset
    document.querySelectorAll('.animated-arc-article').forEach(path => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 4s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 300);
    });
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Logo IArche v4.0 */}
      <div className="text-center mb-6 invisible animate-fadeIn [animation-delay:0.1s]">
        {useSvgLogo ? (
          <Logo variant="main" size="lg" />
        ) : (
          <h2 className="text-2xl md:text-3xl font-semibold hero-gradient-text">
            IArche
          </h2>
        )}
      </div>

      {/* Arcs SVG animés - v4.0 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-[-1]">
        {/* Arc gauche */}
        <svg 
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%]" 
          viewBox="0 0 200 100" 
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="arcGradientArticle1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path 
            className="animated-arc-article" 
            d="M 0 80 A 120 50 0 0 1 200 80"
            fill="none"
            stroke="url(#arcGradientArticle1)"
            strokeWidth="2"
            opacity="0.4"
          />
        </svg>

        {/* Arc droit */}
        <svg 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%]" 
          viewBox="0 0 200 100" 
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="arcGradientArticle2" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--accent))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
          </defs>
          <path 
            className="animated-arc-article" 
            d="M 200 20 A 100 40 0 0 0 0 20"
            fill="none"
            stroke="url(#arcGradientArticle2)"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
};

export default LogoArcheAnimated;
