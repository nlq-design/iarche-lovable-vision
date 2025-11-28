import React, { useEffect } from 'react';

const HeroSection = () => {
  useEffect(() => {
    // Calculate path lengths for accurate animations with staggered delays
    const paths = document.querySelectorAll('.animation-line');
    paths.forEach((path, index) => {
      const svgPath = path as SVGGeometryElement;
      const len = svgPath.getTotalLength();
      const pathElement = path as HTMLElement;
      pathElement.style.strokeDasharray = `${len}px`;
      pathElement.style.strokeDashoffset = `${len}px`;
      
      // Staggered animation: first line at 1.5s, second line at 2.5s
      const delay = 800 + (index * 1000);
      setTimeout(() => {
        pathElement.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
        pathElement.style.strokeDashoffset = '0px';
      }, delay);
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

        @keyframes drawArch {
          to {
            stroke-dashoffset: 0;
          }
        }

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
          
          @keyframes patternScroll {
            0%, 100% { 
              transform: translate(-1%, -1%); 
            }
            50% { 
              transform: translate(1%, 1%); 
            }
          }
          
          @keyframes subtlePulse {
            0% { 
              box-shadow: 0 4px 12px rgba(209, 90, 62, 0.15); 
            }
            50% { 
              box-shadow: 0 6px 18px rgba(209, 90, 62, 0.25); 
            }
            100% { 
              box-shadow: 0 4px 12px rgba(209, 90, 62, 0.15); 
            }
          }
          
          .hero-animate-fadeIn {
            animation: fadeIn 0.8s ease-out forwards;
            opacity: 0;
          }
          
          .hero-animate-patternScroll {
            animation: patternScroll 45s ease-in-out infinite;
          }
          
          
          .hero-pulse-animation {
            animation: subtlePulse 3s ease-in-out infinite;
          }
          
          /* Gradient IArche - Bleu Nuit to Terracotta */
          .hero-gradient-text {
            background: linear-gradient(135deg, hsl(218, 47%, 20%) 0%, hsl(12, 60%, 53%) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          /* Staggered fade-in delays */
          .hero-stagger-1 {
            animation-delay: 0s;
          }
          
          .hero-stagger-2 {
            animation-delay: 0.2s;
          }
          
          .hero-stagger-3 {
            animation-delay: 0.4s;
          }
          
          .hero-stagger-4 {
            animation-delay: 0.6s;
          }
        `}
      </style>
      
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans overflow-hidden relative">
        {/* Container with staggered animations */}
        <div className="container text-center z-10 relative px-6 py-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight font-semibold m-0 relative z-20 mb-6 hero-animate-fadeIn hero-stagger-1">
            <span className="hero-gradient-text">IArche</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed hero-animate-fadeIn hero-stagger-2">
            L'IA se construit avec vous
          </p>
          <div className="flex justify-center hero-animate-fadeIn hero-stagger-3">
            <button className="px-8 py-4 bg-[#D15A3E] text-white rounded-lg cursor-pointer text-lg font-medium transition-all duration-300 ease-in-out hover:bg-[#D15A3E]/90 flex items-center gap-2">
              Entrer
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Dynamic Lines - Staggered animation with gradient */}
        <div className="line-group absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
          <svg className="line-wrapper absolute w-full h-full" viewBox="0 0 177 159" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(218, 47%, 20%)" />
                <stop offset="100%" stopColor="hsl(12, 60%, 53%)" />
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
                <stop offset="0%" stopColor="hsl(12, 60%, 53%)" />
                <stop offset="100%" stopColor="hsl(218, 47%, 20%)" />
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

        {/* Background Patterns - Ultra slow, subtle movement */}
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

        {/* Background rectangles - construction animation */}
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
      </div>
    </>
  );
};

export default HeroSection;
