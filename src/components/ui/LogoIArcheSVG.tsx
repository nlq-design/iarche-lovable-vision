import React from 'react';

interface LogoIArcheSVGProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Logo IArche en SVG animé avec gradient
 * Copiable comme image avec clic-droit
 */
const LogoIArcheSVG: React.FC<LogoIArcheSVGProps> = ({ 
  className = '', 
  width = 200, 
  height = 80 
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="IArche"
    >
      <defs>
        {/* Gradient animé Bleu Nuit ↔ Terracotta */}
        <linearGradient 
          id="logoGradient" 
          x1="0%" 
          y1="0%" 
          x2="100%" 
          y2="0%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="hsl(218, 47%, 20%)">
            <animate
              attributeName="stop-color"
              values="hsl(218, 47%, 20%); hsl(12, 60%, 53%); hsl(218, 47%, 35%); hsl(12, 60%, 53%); hsl(218, 47%, 20%)"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="25%" stopColor="hsl(12, 60%, 53%)">
            <animate
              attributeName="stop-color"
              values="hsl(12, 60%, 53%); hsl(218, 47%, 35%); hsl(12, 60%, 53%); hsl(218, 47%, 20%); hsl(12, 60%, 53%)"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="hsl(218, 47%, 35%)">
            <animate
              attributeName="stop-color"
              values="hsl(218, 47%, 35%); hsl(12, 60%, 53%); hsl(218, 47%, 20%); hsl(12, 60%, 53%); hsl(218, 47%, 35%)"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="75%" stopColor="hsl(12, 60%, 53%)">
            <animate
              attributeName="stop-color"
              values="hsl(12, 60%, 53%); hsl(218, 47%, 20%); hsl(12, 60%, 53%); hsl(218, 47%, 35%); hsl(12, 60%, 53%)"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="hsl(218, 47%, 20%)">
            <animate
              attributeName="stop-color"
              values="hsl(218, 47%, 20%); hsl(12, 60%, 53%); hsl(218, 47%, 35%); hsl(12, 60%, 53%); hsl(218, 47%, 20%)"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Texte IArche avec gradient animé */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="url(#logoGradient)"
        fontSize="48"
        fontWeight="600"
        fontFamily="Manrope, system-ui, -apple-system, sans-serif"
        letterSpacing="-0.02em"
      >
        IArche
      </text>
    </svg>
  );
};

export default LogoIArcheSVG;
