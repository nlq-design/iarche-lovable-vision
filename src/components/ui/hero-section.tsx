import React, { useEffect } from 'react';

const HeroSection = () => {
  useEffect(() => {
    // Calculate path lengths for accurate animations
    const paths = document.querySelectorAll('.animation-line');
    paths.forEach((path) => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Trigger the animation after a short delay
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 2s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, 500);
    });
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes patternScroll {
            0% { 
              transform: translate(-2%, -2%); 
            }
            100% { 
              transform: translate(2%, 2%); 
            }
          }
          
          @keyframes pulse {
            0% { 
              box-shadow: 0 4px 12px rgba(209, 90, 62, 0.2); 
            }
            50% { 
              box-shadow: 0 8px 24px rgba(209, 90, 62, 0.4); 
            }
            100% { 
              box-shadow: 0 4px 12px rgba(209, 90, 62, 0.2); 
            }
          }
          
          .hero-animate-fadeIn {
            animation: fadeIn 1s ease-out forwards;
          }
          
          .hero-animate-patternScroll {
            animation: patternScroll 30s linear infinite;
          }
          
          .hero-animation-line {
            fill: none;
            stroke: hsl(12, 60%, 53%);
            stroke-width: 2;
            opacity: 0.6;
          }
          
          .hero-pulse-animation {
            animation: pulse 2s infinite;
          }
        `}
      </style>
      
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans overflow-hidden relative">
        {/* Container */}
        <div className="container text-center z-10 relative px-6 py-20 hero-animate-fadeIn">
          <p className="text-sm font-medium text-muted-foreground mb-4 tracking-wide uppercase">
            Agence IA · Bayonne
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-semibold m-0 relative z-20 text-primary mb-6">
            L'IA se construit<br />
            <span className="text-accent">avec vous</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Votre entreprise mérite mieux que des slides. Un accompagnement de l'audit à l'autonomie, pour des résultats mesurables.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-accent text-accent-foreground border-none rounded-lg cursor-pointer text-lg font-medium transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-2px] shadow-md hover:scale-105 hero-pulse-animation">
              Nous contacter
            </button>
            <button className="px-8 py-4 bg-transparent text-primary border-2 border-primary rounded-lg cursor-pointer text-lg font-medium transition-all duration-300 ease-in-out hover:bg-primary hover:text-primary-foreground">
              Découvrir l'approche ↓
            </button>
          </div>
        </div>

        {/* Dynamic Lines - Adapted to IArche colors */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none">
            <path 
              id="main-line" 
              className="hero-animation-line animation-line" 
              d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 56C51.5359 57.1046 50.6405 58 49.5359 58L0 58"
            />
          </svg>
          
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 176 59" preserveAspectRatio="none">
            <path 
              className="hero-animation-line animation-line" 
              d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 56C124.464 57.1046 125.36 58 126.464 58L176 58"
            />
          </svg>
        </div>

        {/* Background Patterns - Subtle */}
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-20 hero-animate-patternScroll" 
          style={{ 
            top: '-25%', 
            left: '-25%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)'
          }}
        />
        <div 
          className="pattern absolute w-[150%] h-[150%] opacity-10 hero-animate-patternScroll" 
          style={{ 
            top: '25%', 
            left: '25%',
            background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, hsl(30, 16%, 88%) 20px, hsl(30, 16%, 88%) 22px)',
            animationDelay: '15s'
          }}
        />
      </div>
    </>
  );
};

export default HeroSection;
