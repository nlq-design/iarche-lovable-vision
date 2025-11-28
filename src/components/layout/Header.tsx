import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo SVG */}
          <NavLink to="/accueil" className="flex items-center">
            <svg width="120" height="36" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="headerLogoGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" style={{stopColor:'#1B2A47', stopOpacity:1}} />
                  <stop offset="33.33%" style={{stopColor:'#D15A3E', stopOpacity:1}} />
                  <stop offset="66.67%" style={{stopColor:'#2F4570', stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#D15A3E', stopOpacity:1}} />
                </linearGradient>
              </defs>
              <text 
                x="50%" 
                y="50%" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontFamily="Inter, sans-serif" 
                fontSize="72" 
                fontWeight="600" 
                fill="url(#headerLogoGradient)"
              >
                IArche
              </text>
            </svg>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink 
              to="/services" 
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              Services
            </NavLink>
            <NavLink 
              to="/solutions" 
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              Solutions
            </NavLink>
            <NavLink 
              to="/actualites" 
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              Actualités
            </NavLink>
          </nav>

          {/* CTA */}
          <NavLink to="/contact">
            <Button 
              variant="default"
              className="bg-accent hover:bg-accent/90 text-background font-medium"
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
