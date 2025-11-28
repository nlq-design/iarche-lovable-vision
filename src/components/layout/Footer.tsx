import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Linkedin, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-foreground text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Ligne 1 : Navigation */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-6">
          <a href="#services" className="text-white/70 hover:text-accent transition-colors">
            Services
          </a>
          <a href="#exemples" className="hero-gradient-text font-semibold hover:opacity-80 transition-opacity">
            Nos Solutions
          </a>
          <a href="#actualites" className="text-white/70 hover:text-accent transition-colors">
            Actualités
          </a>
        </nav>

        {/* Grid 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-t border-white/10 pt-6">
          {/* Colonne 1 : IArche */}
          <div>
            <h3 className="text-sm font-semibold mb-3">IArche</h3>
            <p className="text-sm text-white/70 mb-1">Bayonne · France</p>
            <p className="text-sm text-white/70 mb-3">nlq@iarche.fr</p>
            <div className="flex items-center gap-3">
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Colonne 2 : Navigation pages */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Navigation</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/services" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Services
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/solutions" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Solutions
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/actualites" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Actualités
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/contact" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Informations */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Informations</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/newsletter" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Newsletters
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/livre-or" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Livre d'Or
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/mentions-legales" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Mentions
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/conditions-generales" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Conditions générales
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/confidentialite" 
                  className="text-sm text-white/70 hover:text-accent focus:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-foreground rounded transition-colors duration-200"
                >
                  Politique de confidentialité
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-4 mt-6">
          <p className="text-xs text-white/50 text-center">
            © 2025 IArche · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
