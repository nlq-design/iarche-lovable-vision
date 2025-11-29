import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getServiceBySlug } from '@/data/servicesData';

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
  const { slug } = useParams();
  
  // Ne pas afficher sur la homepage
  if (pathname === '/') return null;
  
  // Déterminer le nom de la page
  let pageName = routeNames[pathname] || 'Page';
  let breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://iarche.fr/"
    }
  ];
  
  // Gérer les pages de détail service
  if (pathname.startsWith('/services/') && slug) {
    const service = getServiceBySlug(slug);
    if (service) {
      breadcrumbItems.push({
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": "https://iarche.fr/services"
      });
      breadcrumbItems.push({
        "@type": "ListItem",
        "position": 3,
        "name": service.title,
        "item": `https://iarche.fr/services/${slug}`
      });
      pageName = service.title;
    }
  } else {
    // Pages standards
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": pageName,
      "item": `https://iarche.fr${pathname}`
    });
  }
  
  // Générer le schema breadcrumb
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
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
        className="max-w-6xl mx-auto px-6 pt-24 pb-2"
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
          {breadcrumbItems.slice(1).map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              {index === breadcrumbItems.length - 2 ? (
                <span className="text-foreground font-medium">{item.name}</span>
              ) : (
                <Link 
                  to={item.item.replace('https://iarche.fr', '')}
                  className="hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default BreadcrumbNav;
