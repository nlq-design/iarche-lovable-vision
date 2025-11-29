import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { getServiceBySlug } from '@/data/servicesData';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  
  // Ne pas afficher sur la homepage
  if (pathname === '/') return null;
  
  // Charger le titre de l'article si on est sur une page de détail
  useEffect(() => {
    const loadArticleTitle = async () => {
      if (!slug) return;
      
      // Déterminer si c'est une page de détail d'article
      const isArticleDetail = pathname.startsWith('/solutions/') || 
                             pathname.startsWith('/actualites/') ||
                             pathname.startsWith('/articles/') ||
                             pathname.startsWith('/cas-clients/') ||
                             pathname.startsWith('/livres-blancs/') ||
                             pathname.startsWith('/ateliers-webinaires/');
      
      if (isArticleDetail) {
        const { data } = await supabase
          .from('articles')
          .select('title')
          .eq('slug', slug)
          .single();
        
        if (data) {
          setArticleTitle(data.title);
        }
      }
    };
    
    loadArticleTitle();
  }, [slug, pathname]);
  
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
  } 
  // Gérer les pages de détail solutions
  else if (pathname.startsWith('/solutions/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Solutions",
      "item": "https://iarche.fr/solutions"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/solutions/${slug}`
    });
    pageName = articleTitle;
  }
  // Gérer les pages de détail actualités
  else if (pathname.startsWith('/actualites/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Actualités",
      "item": "https://iarche.fr/actualites"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/actualites/${slug}`
    });
    pageName = articleTitle;
  }
  // Gérer les pages de détail articles
  else if (pathname.startsWith('/articles/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Articles",
      "item": "https://iarche.fr/articles"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/articles/${slug}`
    });
    pageName = articleTitle;
  }
  // Gérer les pages de détail cas clients
  else if (pathname.startsWith('/cas-clients/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Cas clients",
      "item": "https://iarche.fr/cas-clients"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/cas-clients/${slug}`
    });
    pageName = articleTitle;
  }
  // Gérer les pages de détail livres blancs
  else if (pathname.startsWith('/livres-blancs/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Livres blancs",
      "item": "https://iarche.fr/livres-blancs"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/livres-blancs/${slug}`
    });
    pageName = articleTitle;
  }
  // Gérer les pages de détail ateliers & webinaires
  else if (pathname.startsWith('/ateliers-webinaires/') && slug && articleTitle) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": "Ateliers & Webinaires",
      "item": "https://iarche.fr/ateliers-webinaires"
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `https://iarche.fr/ateliers-webinaires/${slug}`
    });
    pageName = articleTitle;
  }
  else {
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
