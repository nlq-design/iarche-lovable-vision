import { memo, useEffect, useRef } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Animation des lignes comme sur le portail
    const paths = svgRef.current.querySelectorAll('.arche-line');
    paths.forEach((path) => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Animation progressive
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 4s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 300);
    });
  }, []);

  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {/* Arches SVG avec croisement diagonal - Style portail */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient Bleu Nuit → Terracotta */}
          <linearGradient id="placeholderGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          
          {/* Gradient Terracotta → Bleu Nuit (inversé) */}
          <linearGradient id="placeholderGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        
        {/* Ligne 1: Haut-droite → Bas-gauche - Dominante (croisement central proportionnel) */}
        <path
          className="arche-line arche-line-primary"
          d="M 380 15 L 220 15 C 217 15 215 17 215 20 L 215 130 C 215 133 212 135 210 135 L 20 135"
          fill="none"
          stroke="url(#placeholderGradient1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        
        {/* Ligne 2: Haut-gauche → Bas-droite - Subtile (croisement central proportionnel) */}
        <path
          className="arche-line arche-line-secondary"
          d="M 20 15 L 180 15 C 183 15 185 17 185 20 L 185 130 C 185 133 188 135 190 135 L 380 135"
          fill="none"
          stroke="url(#placeholderGradient2)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
      
      {/* Logo IArche centré avec gradient animé */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tracking-tight hero-gradient-text">
          IArche
        </span>
      </div>
    </div>
  );
});

ArticlePlaceholder.displayName = 'ArticlePlaceholder';

export default ArticlePlaceholder;
