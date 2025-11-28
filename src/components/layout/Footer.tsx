import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Linkedin } from 'lucide-react';

const Footer = () => {
  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    console.log('Newsletter subscription:', email);
  };

  return (
    <footer className="bg-foreground text-white">
      <div className="container mx-auto px-6 py-12">
        {/* Colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Colonne 1 : IArche */}
          <div>
            <p className="text-sm text-white/70 mb-2">Bayonne · France</p>
            <p className="text-sm text-white/70 mb-4">nlq@iarche.fr</p>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-white hover:text-accent transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>

          {/* Colonne 2 : Navigation */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/services" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Services
                </NavLink>
              </li>
              <li>
                <NavLink to="/solutions" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Solutions
                </NavLink>
              </li>
              <li>
                <NavLink to="/actualites" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Actualités
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Contact
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Légal */}
          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/mentions-legales" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Mentions légales
                </NavLink>
              </li>
              <li>
                <NavLink to="/confidentialite" className="text-sm text-white/70 hover:text-accent transition-colors">
                  Confidentialité
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Restez informé</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
              <Input 
                type="email" 
                name="email"
                placeholder="Votre email"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button 
                type="submit"
                className="bg-accent hover:bg-accent/90 text-background font-medium"
              >
                S'inscrire
              </Button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 pt-6">
          <p className="text-sm text-white/70 text-center">
            © 2025 IArche · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
