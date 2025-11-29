import { memo, useEffect, useRef } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const animatePath = (path: SVGPathElement | null, delay: number) => {
      if (!path) return;
      
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}px`;
      path.style.strokeDashoffset = `${length}px`;
      
      setTimeout(() => {
        path.style.transition = 'stroke-dashoffset 6s ease-in-out';
        path.style.strokeDashoffset = '0px';
      }, delay);
    };

    animatePath(path1Ref.current, 300);
    animatePath(path2Ref.current, 300);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {/* Arches SVG avec croisement diagonal - Style portail exact avec viewBox séparés */}
      
      {/* SVG 1 : Ligne droite→gauche (viewBox quasi-carré pour épaisseur uniforme) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 360"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="archGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <path
          ref={path1Ref}
          className="canalisation-line"
          d="M 390 5 L 130 5 C 128 5 126 7 126 9 L 126 95 C 126 97 124 99 122 99 L 10 99"
          fill="none"
          stroke="url(#archGrad1)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      
      {/* SVG 2 : Ligne gauche→droite (viewBox aplati pour horizontal épais) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 133"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="archGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <path
          ref={path2Ref}
          className="canalisation-line"
          d="M 10 5 L 270 5 C 272 5 274 7 274 9 L 274 185 C 274 187 276 189 278 189 L 390 189"
          fill="none"
          stroke="url(#archGrad2)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
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
