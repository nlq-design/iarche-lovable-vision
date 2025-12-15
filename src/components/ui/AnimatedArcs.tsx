import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedArcsProps {
  className?: string;
}

/**
 * Arcs SVG animés pour le hero section
 * 
 * Remplace les lignes "canalisation" par des arcs
 * conformément à la nouvelle identité IArche v4.0
 */
const AnimatedArcs: React.FC<AnimatedArcsProps> = ({ className }) => {
  useEffect(() => {
    // Animation des arcs avec stroke-dashoffset
    document.querySelectorAll('.animated-arc-path').forEach(path => {
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
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none z-[1]', className)}>
      {/* Arc supérieur gauche - grand */}
      <svg 
        className="absolute top-[10%] left-[-5%] w-[60%] h-[40%]" 
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arcGradientTopLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <path 
          className="animated-arc-path" 
          d="M 0 80 A 150 60 0 0 1 200 80"
          fill="none"
          stroke="url(#arcGradientTopLeft)"
          strokeWidth="2"
          opacity="0.4"
        />
      </svg>

      {/* Arc supérieur droit - moyen */}
      <svg 
        className="absolute top-[5%] right-[-10%] w-[50%] h-[35%]" 
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arcGradientTopRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <path 
          className="animated-arc-path" 
          d="M 200 90 A 120 50 0 0 0 0 90"
          fill="none"
          stroke="url(#arcGradientTopRight)"
          strokeWidth="2"
          opacity="0.3"
        />
      </svg>

      {/* Arc inférieur gauche */}
      <svg 
        className="absolute bottom-[15%] left-[5%] w-[40%] h-[30%]" 
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arcGradientBottomLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        <path 
          className="animated-arc-path" 
          d="M 0 20 A 100 40 0 0 0 200 20"
          fill="none"
          stroke="url(#arcGradientBottomLeft)"
          strokeWidth="1.5"
          opacity="0.25"
        />
      </svg>

      {/* Arc inférieur droit - grand */}
      <svg 
        className="absolute bottom-[10%] right-[-5%] w-[55%] h-[35%]" 
        viewBox="0 0 200 100" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arcGradientBottomRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <path 
          className="animated-arc-path" 
          d="M 200 10 A 140 55 0 0 1 0 10"
          fill="none"
          stroke="url(#arcGradientBottomRight)"
          strokeWidth="2"
          opacity="0.35"
        />
      </svg>
    </div>
  );
};

export default AnimatedArcs;
