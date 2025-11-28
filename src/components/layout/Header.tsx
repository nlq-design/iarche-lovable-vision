import React, { useState } from 'react';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo IArche */}
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            <span className="text-3xl font-semibold hero-gradient-text">IArche</span>
          </button>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#services" 
              className="text-sm text-primary hover:text-primary/80 focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
            >
              Services
            </a>
            <a 
              href="#exemples" 
              className="text-sm hero-gradient-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
            >
              Nos Solutions
            </a>
            <a 
              href="#newsletter" 
              className="text-sm text-accent hover:text-accent/80 focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded transition-colors"
            >
              Actualités
            </a>
          </nav>

          {/* CTA Desktop */}
          <button
            onClick={() => {
              const footer = document.querySelector('footer');
              footer?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:block bg-accent hover:bg-accent/90 focus:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-background font-medium transition-all px-4 py-2 rounded-md cursor-pointer"
          >
            Nous contacter
          </button>

          {/* Bouton Hamburger Mobile */}
          <button 
            className="md:hidden p-2 text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col gap-4">
              <a 
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-primary hover:text-primary/80 focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
              >
                Services
              </a>
              <a 
                href="#exemples"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm hero-gradient-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
              >
                Nos Solutions
              </a>
              <a 
                href="#newsletter"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-accent hover:text-accent/80 focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded transition-colors"
              >
                Actualités
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  const footer = document.querySelector('footer');
                  footer?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-accent hover:bg-accent/90 focus:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-background font-medium transition-all px-4 py-2 rounded-md cursor-pointer text-sm text-left"
              >
                Nous contacter
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
