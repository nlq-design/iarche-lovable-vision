import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import GradientLink from '@/components/ui/GradientLink';
import Logo from '@/components/ui/Logo';
import { ChevronDown } from 'lucide-react';
import { useCTATracking } from '@/hooks/useCTATracking';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { trackCTAClick } = useCTATracking();

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo IArche v4.0 */}
          <button 
            onClick={() => navigate('/')}
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
          >
            <Logo variant="main" size="md" />
          </button>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink 
              to="/services"
              className={({ isActive }) => 
                `text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded px-2 py-1 ${
                  isActive 
                    ? 'hero-gradient-text font-semibold' 
                    : 'hero-gradient-text'
                }`
              }
            >
              Services
            </NavLink>
            <NavLink 
              to="/solutions"
              className={({ isActive }) => 
                `text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded px-2 py-1 ${
                  isActive 
                    ? 'hero-gradient-text font-semibold' 
                    : 'hero-gradient-text'
                }`
              }
            >
              Nos Solutions
            </NavLink>
            
            {/* Menu Ressources - pointe vers /actualites avec dropdown */}
            <div 
              className="relative" 
              ref={dropdownRef}
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                onClick={() => {
                  navigate('/actualites');
                  setResourcesOpen(false);
                }}
                className="flex items-center gap-1 text-sm hero-gradient-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded px-2 py-1"
              >
                Ressources
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResourcesOpen(!resourcesOpen);
                  }}
                />
              </button>

              {/* Dropdown */}
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 bg-background border border-border shadow-lg rounded-lg py-2 min-w-[220px] z-50">
                  <NavLink
                    to="/actualites"
                    onClick={() => setResourcesOpen(false)}
                    className="block px-4 py-2 text-sm hero-gradient-text hover:bg-muted transition-colors"
                  >
                    Actualités
                  </NavLink>
                  <NavLink
                    to="/articles"
                    onClick={() => setResourcesOpen(false)}
                    className="block px-4 py-2 text-sm hero-gradient-text hover:bg-muted transition-colors"
                  >
                    Articles
                  </NavLink>
                  <NavLink
                    to="/cas-clients"
                    onClick={() => setResourcesOpen(false)}
                    className="block px-4 py-2 text-sm hero-gradient-text hover:bg-muted transition-colors"
                  >
                    Cas clients
                  </NavLink>
                  <NavLink
                    to="/livres-blancs"
                    onClick={() => setResourcesOpen(false)}
                    className="block px-4 py-2 text-sm hero-gradient-text hover:bg-muted transition-colors"
                  >
                    Livres blancs
                  </NavLink>
                  <NavLink
                    to="/ateliers-webinaires"
                    onClick={() => setResourcesOpen(false)}
                    className="block px-4 py-2 text-sm hero-gradient-text hover:bg-muted transition-colors"
                  >
                    Ateliers & Webinaires
                  </NavLink>
                </div>
              )}
            </div>
          </nav>

          {/* CTA Desktop */}
          <div className="hidden md:block">
            <GradientLink onClick={() => {
              trackCTAClick('nous_contacter', 'header');
              navigate('/contact?source=header');
            }}>
              Nous contacter
            </GradientLink>
          </div>

          {/* Bouton Hamburger Mobile */}
          <button 
            className="md:hidden p-2 text-foreground hover:text-primary focus:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
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
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col gap-4">
              <NavLink 
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded px-2 py-1 ${
                    isActive 
                      ? 'hero-gradient-text font-semibold' 
                      : 'hero-gradient-text'
                  }`
                }
              >
                Services
              </NavLink>
              <NavLink 
                to="/solutions"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => 
                  `text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded px-2 py-1 ${
                    isActive 
                      ? 'hero-gradient-text font-semibold' 
                      : 'hero-gradient-text'
                  }`
                }
              >
                Nos Solutions
              </NavLink>
              
              {/* Ressources Mobile avec sous-menu */}
              <div className="flex flex-col gap-2">
                <NavLink 
                  to="/actualites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm hero-gradient-text font-semibold px-2 py-1 transition-colors"
                >
                  Ressources
                </NavLink>
                <div className="pl-4 flex flex-col gap-2 border-l-2 border-accent/30">
                  <NavLink 
                    to="/actualites"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm hero-gradient-text transition-colors px-2 py-1"
                  >
                    Actualités
                  </NavLink>
                  <NavLink 
                    to="/articles"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm hero-gradient-text transition-colors px-2 py-1"
                  >
                    Articles
                  </NavLink>
                  <NavLink 
                    to="/cas-clients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm hero-gradient-text transition-colors px-2 py-1"
                  >
                    Cas clients
                  </NavLink>
                  <NavLink 
                    to="/livres-blancs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm hero-gradient-text transition-colors px-2 py-1"
                  >
                    Livres blancs
                  </NavLink>
                  <NavLink 
                    to="/ateliers-webinaires"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm hero-gradient-text transition-colors px-2 py-1"
                  >
                    Ateliers & Webinaires
                  </NavLink>
                </div>
              </div>
              
              <GradientLink 
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackCTAClick('nous_contacter', 'header_mobile');
                  navigate('/contact?source=header');
                }}
                className="text-sm"
              >
                Nous contacter
              </GradientLink>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
