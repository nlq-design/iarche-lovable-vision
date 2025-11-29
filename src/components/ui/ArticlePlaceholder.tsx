import { memo } from 'react';

interface ArticlePlaceholderProps {
  className?: string;
}

const ArticlePlaceholder = memo(({ className = '' }: ArticlePlaceholderProps) => {
  return (
    <div className={`relative overflow-hidden bg-[hsl(var(--background))] ${className}`}>
      {/* Arches SVG - FIXES (pas animées) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient Bleu → Terracotta */}
          <linearGradient id="archGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(218, 47%, 20%)" />
            <stop offset="100%" stopColor="hsl(12, 60%, 53%)" />
          </linearGradient>
          
          {/* Gradient Terracotta → Bleu (inversé) */}
          <linearGradient id="archGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(12, 60%, 53%)" />
            <stop offset="100%" stopColor="hsl(218, 47%, 20%)" />
          </linearGradient>
        </defs>
        
        {/* Ligne arche 1 - haut droite vers bas */}
        <path
          d="M 380 0 L 380 120 Q 380 150 350 150 L 200 150"
          fill="none"
          stroke="url(#archGradient1)"
          strokeWidth="2"
          opacity="0.4"
        />
        
        {/* Ligne arche 2 - bas gauche vers haut */}
        <path
          d="M 20 300 L 20 180 Q 20 150 50 150 L 200 150"
          fill="none"
          stroke="url(#archGradient2)"
          strokeWidth="2"
          opacity="0.4"
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
