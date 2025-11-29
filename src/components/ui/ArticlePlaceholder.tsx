import { memo } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {/* Arches SVG - Arche symétrique encadrant le logo */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient Bleu Nuit → Terracotta */}
          <linearGradient id="placeholderGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(218, 47%, 20%)" />
            <stop offset="100%" stopColor="hsl(12, 60%, 53%)" />
          </linearGradient>
          
          {/* Gradient Terracotta → Bleu Nuit (inversé) */}
          <linearGradient id="placeholderGradient2" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(218, 47%, 20%)" />
            <stop offset="100%" stopColor="hsl(12, 60%, 53%)" />
          </linearGradient>
        </defs>
        
        {/* Ligne arche droite - Forme le côté droit de l'arche */}
        <path
          d="M 320 20 
             L 320 70 
             Q 320 100 290 100 
             L 230 100"
          fill="none"
          stroke="url(#placeholderGradient1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Ligne arche gauche - Forme le côté gauche de l'arche (symétrique) */}
        <path
          d="M 80 180 
             L 80 130 
             Q 80 100 110 100 
             L 170 100"
          fill="none"
          stroke="url(#placeholderGradient2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
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
