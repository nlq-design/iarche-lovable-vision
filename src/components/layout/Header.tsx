import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo IArche */}
          <NavLink to="/accueil" className="flex items-center">
            <span className="text-3xl font-semibold hero-gradient-text">IArche</span>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
          <NavLink 
            to="/services" 
            className="text-sm text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
          >
            Services
          </NavLink>
          <NavLink 
            to="/solutions" 
            className="text-sm text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
          >
            Solutions
          </NavLink>
          <NavLink 
            to="/actualites" 
            className="text-sm text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded transition-colors"
          >
            Actualités
          </NavLink>
          </nav>

          {/* CTA */}
        <NavLink to="/contact">
          <Button 
            variant="default"
            className="bg-accent hover:bg-accent/90 focus:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 text-background font-medium transition-all"
          >
            Nous contacter
          </Button>
        </NavLink>
        </div>
      </div>
    </header>
  );
};

export default Header;
