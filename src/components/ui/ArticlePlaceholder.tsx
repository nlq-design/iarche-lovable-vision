import { memo } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {/* Arches SVG - Reproduction exacte du style portail */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient Bleu Nuit → Terracotta (comme le portail) */}
          <linearGradient id="placeholderGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          
          {/* Gradient Terracotta → Bleu Nuit (inversé comme le portail) */}
          <linearGradient id="placeholderGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        
        {/* Ligne arche 1 - Haut droite vers bas gauche (style portail) */}
        <path
          d="M 380 10 L 120 10 C 118 10 116 12 116 14 L 116 86 C 116 88 114 90 112 90 L 20 90"
          fill="none"
          stroke="url(#placeholderGradient1)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        
        {/* Ligne arche 2 - Bas gauche vers haut droite (style portail inversé) */}
        <path
          d="M 20 190 L 280 190 C 282 190 284 188 284 186 L 284 114 C 284 112 286 110 288 110 L 380 110"
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
