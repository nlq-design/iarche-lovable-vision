import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo IArche */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            <span className="text-3xl font-semibold hero-gradient-text">IArche</span>
          </button>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-6">
...
          </nav>

          {/* CTA Desktop */}
          <button
            onClick={() => navigate('/contact')}
            className="hidden lg:block border-2 border-accent text-accent hover:bg-accent hover:text-background focus:bg-accent focus:text-background focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-medium transition-all px-4 py-2 rounded-md cursor-pointer whitespace-nowrap"
          >
            Nous contacter
          </button>

          {/* Bouton Hamburger Mobile */}
          <button 
            className="lg:hidden p-2 text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          <div className="lg:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col gap-4">
              <NavLink 
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-2 py-1 ${
                    isActive 
                      ? 'text-primary font-semibold' 
                      : 'text-primary hover:text-primary/80'
                  }`
                }
              >
                Services
              </NavLink>
              <NavLink 
                to="/solutions"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-2 py-1 ${
                    isActive 
                      ? 'hero-gradient-text font-semibold' 
                      : 'hero-gradient-text'
                  }`
                }
              >
                Nos Solutions
              </NavLink>
              <NavLink 
                to="/actualites"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded px-2 py-1 ${
                    isActive 
                      ? 'text-accent font-semibold' 
                      : 'text-accent hover:text-accent/80'
                  }`
                }
              >
                Actualités
              </NavLink>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/contact');
                }}
                className="border-2 border-accent text-accent hover:bg-accent hover:text-background focus:bg-accent focus:text-background focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-medium transition-all px-4 py-2 rounded-md cursor-pointer text-sm text-left"
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
