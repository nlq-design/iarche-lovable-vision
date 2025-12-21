import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Linkedin, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-[hsl(220,25%,12%)] via-[hsl(220,20%,18%)] to-[hsl(220,15%,22%)] text-[hsl(45,30%,95%)]">
      <div className="container mx-auto px-6 py-8">
        {/* Grid 5 colonnes sur desktop, 2 sur tablette, 1 sur mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          {/* Colonne 1 : IArche */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[hsl(45,30%,95%)]">IArche</h3>
            <p className="text-sm text-[hsl(45,20%,85%)] mb-1">Bayonne · France</p>
            <p className="text-sm text-[hsl(45,20%,85%)] mb-1">nlq@iarche.fr</p>
            <p className="text-sm text-[hsl(45,20%,85%)] mb-3">
              <a 
                href="tel:+33661741381" 
                className="no-underline text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
              >
                06 61 74 13 81
              </a>
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                  className="text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" aria-hidden="true" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                  className="text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer"
                  className="text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                  className="text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Colonne 2 : Services */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[hsl(45,30%,95%)]">Services</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/services/audit" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Audit & Conseil
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/services/developpement" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Développement & Intégration
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/services/accompagnement" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Accompagnement & Autonomie
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/services/conformite" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Conformité & Réglementation
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Solutions */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[hsl(45,30%,95%)]">Solutions</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/solutions" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Toutes nos solutions
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/solutions/collaboria" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Collaboria
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/solutions/datalia" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Datalia
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/contact" 
                  className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                >
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Ressources */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[hsl(45,30%,95%)]">Ressources</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/actualites" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Actualités
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/articles" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Articles
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/cas-clients" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Cas clients
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/livres-blancs" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Livres blancs
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/ateliers-webinaires" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Ateliers & Webinaires
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/newsletter" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Newsletters
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 5 : Informations légales */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-[hsl(45,30%,95%)]">Informations</h3>
            <ul className="space-y-1.5">
              <li>
                <NavLink 
                  to="/livre-or" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Livre d'Or
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/mentions-legales" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Mentions légales
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/conditions-generales" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    CGU
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/confidentialite" 
                    className="text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200"
                  >
                    Confidentialité
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[hsl(45,20%,85%)]/10 pt-4 mt-6">
          <p className="text-xs text-[hsl(45,20%,80%)] text-center">
            © 2025 IArche · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
