import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const PortalPage = () => {
  const [showArch, setShowArch] = useState(false);

  useEffect(() => {
    // Trigger arch animation after text appears
    const timer = setTimeout(() => {
      setShowArch(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    // TODO: Navigate to main site when ready
    console.log('Enter clicked - will navigate to main site');
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes drawArch {
            from {
              stroke-dashoffset: 200;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
          
          @keyframes constructionGrid {
            0% {
              opacity: 0;
              transform: scale(0.95);
            }
            100% {
              opacity: 0.15;
              transform: scale(1);
            }
          }
          
          @keyframes floatParticle {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 0;
            }
            50% {
              opacity: 0.6;
            }
            100% {
              transform: translate(var(--tx), var(--ty)) scale(0.5);
              opacity: 0;
            }
          }
          
          .portal-fade-in {
            animation: fadeInUp 1s ease-out forwards;
            opacity: 0;
          }
          
          .portal-delay-1 {
            animation-delay: 0.3s;
          }
          
          .portal-delay-2 {
            animation-delay: 0.8s;
          }
          
          .arch-path {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
          }
          
          .arch-path.animate {
            animation: drawArch 1.5s ease-out forwards;
          }
          
          .construction-grid {
            animation: constructionGrid 2s ease-out forwards;
          }
          
          .particle {
            animation: floatParticle 3s ease-out infinite;
          }
        `}
      </style>
      
      <div className="min-h-screen w-full bg-background flex items-center justify-center overflow-hidden relative">
        {/* Background construction elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Subtle grid pattern */}
          <div 
            className="construction-grid absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(hsl(30, 16%, 88%) 1px, transparent 1px),
                linear-gradient(90deg, hsl(30, 16%, 88%) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              opacity: 0
            }}
          />
          
          {/* Floating geometric shapes */}
          <div className="absolute top-1/4 left-1/4 w-20 h-20 border border-primary/10 rotate-45 construction-grid" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-16 h-16 border border-accent/10 construction-grid" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/3 w-12 h-12 border border-primary/10 rotate-12 construction-grid" style={{ animationDelay: '1.5s' }} />
          
          {/* Convergent particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="particle absolute w-1 h-1 bg-accent/30 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                '--tx': `${Math.cos((i * Math.PI * 2) / 8) * 200}px`,
                '--ty': `${Math.sin((i * Math.PI * 2) / 8) * 200}px`,
                animationDelay: `${i * 0.2}s`
              } as React.CSSProperties}
            />
          ))}
        </div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6">
          {/* Logo IArche with animated arch */}
          <div className="portal-fade-in">
            <svg 
              width="280" 
              height="140" 
              viewBox="0 0 280 140" 
              className="mb-4"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Text "IArche" */}
              <text
                x="10"
                y="100"
                fontFamily="Inter, sans-serif"
                fontSize="80"
                fontWeight="600"
                letterSpacing="-2"
              >
                <tspan fill="hsl(218, 47%, 20%)">I</tspan>
                <tspan fill="hsl(12, 60%, 53%)">Arche</tspan>
              </text>
              
              {/* Animated arch connecting I to e */}
              <path
                d="M 35 30 Q 140 10, 245 30"
                stroke="hsl(12, 60%, 53%)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className={`arch-path ${showArch ? 'animate' : ''}`}
              />
            </svg>
          </div>
          
          {/* Baseline */}
          <p className="text-xl md:text-2xl text-foreground/80 font-light tracking-wide portal-fade-in portal-delay-1 text-center">
            L'IA se construit avec vous
          </p>
          
          {/* CTA Button */}
          <button
            onClick={handleEnter}
            className="portal-fade-in portal-delay-2 group px-10 py-4 bg-accent text-accent-foreground rounded-lg font-medium text-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center gap-3"
          >
            Entrer
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </>
  );
};

export default PortalPage;
