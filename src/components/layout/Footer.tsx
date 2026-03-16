import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Linkedin, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  const linkClass = "text-sm text-[hsl(45,20%,85%)] hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(220,25%,12%)] rounded transition-colors duration-200";

  return (
    <footer className="bg-gradient-to-br from-[hsl(220,25%,12%)] via-[hsl(220,20%,18%)] to-[hsl(220,15%,22%)] text-[hsl(45,30%,95%)]">
      <div className="container mx-auto px-6 py-10">
        {/* Grid 4 colonnes sur desktop, 2 sur tablette, 1 sur mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Colonne 1 : IArche */}
          <div>
            <img 
              src="/logos/iarche-white.svg" 
              alt="IArche" 
              className="h-8 w-auto mb-4"
            />
            <p className="text-sm text-[hsl(45,20%,85%)] mb-1">Bayonne · France</p>
            <p className="text-sm text-[hsl(45,20%,85%)] mb-1">
              <a 
                href="mailto:nlq@iarche.fr" 
                className={linkClass}
              >
                nlq@iarche.fr
              </a>
            </p>
            <p className="text-sm text-[hsl(45,20%,85%)] mb-4">
              <a 
                href="tel:+33661741381" 
                className={linkClass}
              >
                06 61 74 13 81
              </a>
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://www.linkedin.com/company/iarche" 
                target="_blank" 
                rel="noopener noreferrer"
                className={linkClass}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" aria-hidden="true" />
              </a>
              <a 
                href="https://www.instagram.com/iarche.ia" 
                target="_blank" 
                rel="noopener noreferrer"
                className={linkClass}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a 
                href="https://www.tiktok.com/@iarche.ia" 
                target="_blank" 
                rel="noopener noreferrer"
                className={linkClass}
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/iarche.ia" 
                target="_blank" 
                rel="noopener noreferrer"
                className={linkClass}
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Colonne 2 : Services */}
          <div>
            <h3 className="text-base font-semibold mb-4 text-[hsl(45,30%,95%)]">Services</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/services/audit" className={linkClass}>
                  Audit & Conseil
                </NavLink>
              </li>
              <li>
                <NavLink to="/services/developpement" className={linkClass}>
                  Développement & Intégration
                </NavLink>
              </li>
              <li>
                <NavLink to="/services/accompagnement" className={linkClass}>
                  Accompagnement & Autonomie
                </NavLink>
              </li>
              <li>
                <NavLink to="/services/conformite" className={linkClass}>
                  Conformité & Réglementation
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Ressources */}
          <div>
            <h3 className="text-base font-semibold mb-4 text-[hsl(45,30%,95%)]">Ressources</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/articles" className={linkClass}>
                  Articles
                </NavLink>
              </li>
              <li>
                <NavLink to="/livres-blancs" className={linkClass}>
                  Livres blancs
                </NavLink>
              </li>
              <li>
                <NavLink to="/ateliers-webinaires" className={linkClass}>
                  Ateliers & Webinaires
                </NavLink>
              </li>
              <li>
                <NavLink to="/actualites" className={linkClass}>
                  Actualités
                </NavLink>
              </li>
              <li>
                <NavLink to="/cas-clients" className={linkClass}>
                  Cas clients
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Contact & Légal */}
          <div>
            <h3 className="text-base font-semibold mb-4 text-[hsl(45,30%,95%)]">Contact & Légal</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/rendez-vous/premier-echange" className={linkClass}>
                  Prendre rendez-vous
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className={linkClass}>
                  Nous contacter
                </NavLink>
              </li>
              <li>
                <NavLink to="/livre-or" className={linkClass}>
                  Livre d'Or
                </NavLink>
              </li>
              <li className="pt-2 border-t border-[hsl(45,20%,85%)]/10">
                <NavLink to="/mentions-legales" className={linkClass}>
                  Mentions légales
                </NavLink>
              </li>
              <li>
                <NavLink to="/conditions-generales" className={linkClass}>
                  CGU
                </NavLink>
              </li>
              <li>
                <NavLink to="/confidentialite" className={linkClass}>
                  Confidentialité
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[hsl(45,20%,85%)]/10 pt-6">
          <p className="text-xs text-[hsl(45,20%,80%)] text-center">
            © {new Date().getFullYear()} IArche · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
