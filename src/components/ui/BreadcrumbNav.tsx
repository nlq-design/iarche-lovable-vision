import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const routeNames: Record<string, string> = {
  '/services': 'Services',
  '/solutions': 'Solutions',
  '/actualites': 'Actualités',
  '/articles': 'Articles',
  '/cas-clients': 'Cas clients',
  '/livres-blancs': 'Livres blancs',
  '/ateliers-webinaires': 'Ateliers & Webinaires',
  '/contact': 'Contact',
  '/newsletter': 'Newsletter',
  '/livre-or': "Livre d'Or",
  '/mentions-legales': 'Mentions légales',
  '/conditions-generales': 'Conditions générales',
  '/confidentialite': 'Confidentialité',
};

const BreadcrumbNav = () => {
  const { pathname } = useLocation();
  
  // Ne pas afficher sur la homepage
  if (pathname === '/') return null;
  
  const pageName = routeNames[pathname] || 'Page';
  
  // Générer le schema breadcrumb
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://iarche.fr/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageName,
        "item": `https://iarche.fr${pathname}`
      }
    ]
  };
  
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>
      
      <nav 
        aria-label="Fil d'Ariane" 
        className="max-w-6xl mx-auto px-6 pt-24 pb-4"
      >
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link 
              to="/" 
              className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              Accueil
            </Link>
          </li>
          <li>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </li>
          <li>
            <span className="text-foreground font-medium">{pageName}</span>
          </li>
        </ol>
      </nav>
    </>
  );
};

export default BreadcrumbNav;
