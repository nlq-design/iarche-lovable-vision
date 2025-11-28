import React from 'react';

const Page = () => {
  return (
    <>
      <style>
        {`
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
            0% { transform: translate(-5%, -5%); }
            100% { transform: translate(5%, 5%); }
          }
          
          .hero-animate-patternScroll {
            animation: patternScroll 20s linear infinite;
          }
        `}
      </style>
      
      <div className="min-h-screen bg-background text-foreground font-sans overflow-hidden relative flex items-center justify-center">
        
        {/* Contenu central (vide pour l'instant) */}
        <div className="container text-center z-10 relative px-6 py-20">
          <p className="text-muted-foreground">Page de test - Fond et animations</p>
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

export default Page;
