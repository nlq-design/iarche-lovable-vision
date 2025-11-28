import React, { useEffect } from 'react';

const Back = () => {
  useEffect(() => {
    // Calculate path lengths for accurate animations with staggered delays
    const paths = document.querySelectorAll('.animation-line');
    paths.forEach((path, index) => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Staggered animation
      const delay = 500 + (index * 1000);
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 2s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, delay);
    });
  }, []);

  return (
    <>
      <style>
        {`
        /* Fade In avec FOUC prevention */
        @keyframes fadeIn {
          0% {
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
          }
          1% {
            visibility: visible;
          }
          100% {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
          }
        }

        /* Gradient animé */
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        /* Scroll du quadrillage */
        @keyframes patternScroll {
          0% { transform: translate(-5%, -5%); }
          100% { transform: translate(5%, 5%); }
        }
        
        /* Animation des rectangles décoratifs */
        @keyframes constructionFade {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.5;
            transform: scale(1);
          }
        }
        
        /* Pulse sur bouton */
        @keyframes subtlePulse {
          0% { 
            box-shadow: 0 0 10px rgba(209, 90, 62, 0.3); 
          }
          50% { 
            box-shadow: 0 0 25px rgba(209, 90, 62, 0.6); 
          }
          100% { 
            box-shadow: 0 0 10px rgba(209, 90, 62, 0.3); 
          }
        }
        
        /* Fade In générique */
        .hero-animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
          visibility: hidden;
          will-change: opacity, transform, visibility;
        }
        
        /* Scroll du pattern */
        .hero-animate-patternScroll {
          animation: patternScroll 20s linear infinite;
        }
        
        /* Pulse animation */
        .hero-pulse-animation {
          animation: subtlePulse 2s ease-in-out infinite;
          will-change: box-shadow;
        }
        
        /* Gradient IArche animé */
        .hero-gradient-text {
          background: linear-gradient(270deg, hsl(218, 47%, 20%), hsl(12, 60%, 53%), hsl(218, 47%, 35%), hsl(12, 60%, 53%));
          background-size: 600% 600%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient 15s ease infinite;
          will-change: background-position;
        }
        
        /* Délais échelonnés */
        .hero-stagger-1 { animation-delay: 0s; }
        .hero-stagger-2 { animation-delay: 0.2s; }
        .hero-stagger-3 { animation-delay: 0.4s; }
        .hero-stagger-4 { animation-delay: 0.6s; }
        `}
      </style>
      
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans overflow-hidden relative">
        {/* Container avec animations échelonnées */}
        <div className="container text-center z-10 relative px-6 py-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-semibold m-0 relative z-20 mb-20 md:mb-28 hero-animate-fadeIn hero-stagger-1" style={{ visibility: 'hidden' }}>
            <span className="hero-gradient-text">IArche</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-16 leading-relaxed hero-animate-fadeIn hero-stagger-2" style={{ visibility: 'hidden' }}>
            Page de test — Design system complet
          </p>
          <div className="flex justify-center hero-animate-fadeIn hero-stagger-3" style={{ visibility: 'hidden' }}>
            <a 
              href="/" 
              className="inline-flex items-center gap-2 text-primary font-medium text-lg hover:gap-3 transition-all duration-300 group"
            >
              Retour
              <svg 
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* SVG Lignes animées - Staggered animation avec gradient */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              id="main-line" 
              className="animation-line" 
              stroke="url(#lineGradient1)"
              style={{ fill: 'none', strokeWidth: 2, opacity: 0.6 }}
              d="M176 1L53.5359 1C52.4313 1 51.5359 1.89543 51.5359 3L51.5359 56C51.5359 57.1046 50.6405 58 49.5359 58L0 58"
            />
          </svg>
          
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 176 59" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
            </defs>
            <path 
              className="animation-line" 
              stroke="url(#lineGradient2)"
              style={{ fill: 'none', strokeWidth: 2, opacity: 0.6 }}
              d="M0 1L122.464 1C123.569 1 124.464 1.89543 124.464 3L124.464 56C124.464 57.1046 125.36 58 126.464 58L176 58"
            />
          </svg>
        </div>

        {/* Quadrillage diagonal - Ultra slow, subtle movement */}
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
            animationDelay: '22.5s'
          }}
        />

        {/* Rectangles décoratifs - construction animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-20 left-10 w-32 h-32 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />
          <div 
            className="absolute bottom-32 right-20 w-24 h-24 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />
          <div 
            className="absolute top-1/2 right-10 w-40 h-40 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />
          <div 
            className="absolute bottom-20 left-1/4 w-28 h-28 border border-border/30 rounded-lg" 
            style={{
              animation: 'constructionFade 4s ease-in-out infinite',
              animationDelay: '3s'
            }}
          />
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10 hero-animate-fadeIn hero-stagger-4" style={{ visibility: 'hidden' }}>
          <p className="text-sm mb-2 text-text-subtle">
            Bayonne · France · <a href="mailto:nlq@iarche.fr" className="hover:underline transition-all duration-200">nlq@iarche.fr</a>
          </p>
          <a 
            href="/" 
            className="text-sm text-muted-foreground hover:text-accent inline-flex items-center gap-1 transition-all duration-300 group"
          >
            Retour à l'accueil<span className="inline-block w-1"></span>
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
};

export default Back;
