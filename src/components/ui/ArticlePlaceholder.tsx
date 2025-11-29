import { memo } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {/* Arches SVG - Version corrigée symétrique comme le portail */}
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
        
        {/* Ligne arche 1 - HAUT DROITE : descend puis tourne vers centre-gauche */}
        <path
          d="M 380 10 
             L 380 60 
             Q 380 80 360 80 
             L 220 80"
          fill="none"
          stroke="url(#placeholderGradient1)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        
        {/* Ligne arche 2 - BAS GAUCHE : monte puis tourne vers centre-droite */}
        <path
          d="M 20 190 
             L 20 140 
             Q 20 120 40 120 
             L 180 120"
          fill="none"
          stroke="url(#placeholderGradient2)"
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
