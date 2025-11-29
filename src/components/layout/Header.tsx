import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import GradientLink from '@/components/ui/GradientLink';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ChevronDown } from 'lucide-react';

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
            className="flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded"
          >
            <span className="text-3xl font-semibold hero-gradient-text">IArche</span>
          </button>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink 
              to="/services"
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
            
            {/* Menu Ressources */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm text-accent hover:text-accent/80 focus:text-accent bg-transparent hover:bg-transparent data-[state=open]:bg-transparent focus:ring-2 focus:ring-accent">
                    Ressources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-background border border-border shadow-lg rounded-lg p-4 min-w-[240px]">
                    <ul className="flex flex-col gap-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <NavLink
                            to="/actualites"
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            Actualités
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <NavLink
                            to="/ressources/articles"
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            Articles
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <NavLink
                            to="/ressources/cas-clients"
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            Cas clients
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <NavLink
                            to="/ressources/livres-blancs"
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            Livres blancs
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <NavLink
                            to="/ressources/ateliers-webinaires"
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            Ateliers & Webinaires
                          </NavLink>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* CTA Desktop */}
          <div className="hidden md:block">
            <GradientLink onClick={() => navigate('/contact')}>
              Nous contacter
            </GradientLink>
          </div>

          {/* Bouton Hamburger Mobile */}
          <button 
            className="md:hidden p-2 text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded transition-colors"
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
              
              {/* Ressources Mobile avec sous-menu */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-accent font-semibold px-2 py-1">Ressources</span>
                <div className="pl-4 flex flex-col gap-2 border-l-2 border-accent/30">
                  <NavLink 
                    to="/actualites"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground hover:text-accent transition-colors px-2 py-1"
                  >
                    Actualités
                  </NavLink>
                  <NavLink 
                    to="/ressources/articles"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground hover:text-accent transition-colors px-2 py-1"
                  >
                    Articles
                  </NavLink>
                  <NavLink 
                    to="/ressources/cas-clients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground hover:text-accent transition-colors px-2 py-1"
                  >
                    Cas clients
                  </NavLink>
                  <NavLink 
                    to="/ressources/livres-blancs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground hover:text-accent transition-colors px-2 py-1"
                  >
                    Livres blancs
                  </NavLink>
                  <NavLink 
                    to="/ressources/ateliers-webinaires"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground hover:text-accent transition-colors px-2 py-1"
                  >
                    Ateliers & Webinaires
                  </NavLink>
                </div>
              </div>
              
              <GradientLink 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/contact');
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
