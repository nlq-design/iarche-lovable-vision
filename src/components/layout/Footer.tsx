import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-foreground text-white">
      <div className="container mx-auto px-6 py-12">
        {/* Grid 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Colonne 1 : IArche */}
          <div>
            <h3 className="text-sm font-semibold mb-4">IArche</h3>
            <p className="text-sm text-white/70 mb-1">Bayonne · France</p>
            <p className="text-sm text-white/70 mb-4">nlq@iarche.fr</p>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-white/70 hover:text-accent transition-colors duration-200"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>

          {/* Colonne 2 : Navigation */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/services" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Services
                </NavLink>
              </li>
              <li>
                <NavLink to="/solutions" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Solutions
                </NavLink>
              </li>
              <li>
                <NavLink to="/actualites" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Actualités
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Informations */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Informations</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/newsletter" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Newsletter
                </NavLink>
              </li>
              <li>
                <NavLink to="/mentions-legales" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Mentions légales
                </NavLink>
              </li>
              <li>
                <NavLink to="/confidentialite" className="text-sm text-white/70 hover:text-accent transition-colors duration-200 leading-loose">
                  Confidentialité
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-6 mt-8">
          <p className="text-xs text-white/50 text-center">
            © 2025 IArche · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
