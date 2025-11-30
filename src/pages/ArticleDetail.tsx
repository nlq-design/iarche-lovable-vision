import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { ArticleComments } from '@/components/ArticleComments';
import { ArticleFAQ } from '@/components/ArticleFAQ';
import DOMPurify from 'dompurify';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';
import GradientLink from '@/components/ui/GradientLink';
import { Badge } from '@/components/ui/badge';
import SolutionContactForm from '@/components/SolutionContactForm';
import LivreBlancsForm from '@/components/LivreBlancsForm';
import AtelierInscriptionForm from '@/components/AtelierInscriptionForm';
import AuthorCard from '@/components/ui/AuthorCard';
import RelatedArticles from '@/components/ui/RelatedArticles';
import { useCTATracking } from '@/hooks/useCTATracking';
import { TableOfContents } from '@/components/ui/TableOfContents';
import { RessourcesComplementaires } from '@/components/ui/RessourcesComplementaires';
import 'react-quill/dist/quill.snow.css';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  resource_type: string;
  event_date: string | null;
  event_location: string | null;
  registration_open: boolean | null;
  file_url: string | null;
  replay_url: string | null;
  tags: string[] | null;
  ressources_complementaires: any;
  actualite_type: string | null;
  source_externe: any;
  secteur_activite: string | null;
  taille_entreprise: string | null;
  problematique: string | null;
  nombre_pages: number | null;
  format_fichier: string | null;
  taille_fichier_bytes: number | null;
  langues_disponibles: string[] | null;
  niveau: string | null;
  thematiques: string[] | null;
  version_document: string | null;
  cta_personnalise: string | null;
  compteur_telechargements: number | null;
  duree_heures: number | null;
  heure_debut: string | null;
  type_evenement: string | null;
  prerequis: string | null;
  programme_detaille: any;
  intervenants: any;
  outils_requis: string[] | null;
  certificat_delivre: boolean | null;
  sondage_post_evenement_url: string | null;
  documents_telechargeables: any;
  rappels_automatiques: boolean | null;
  cta_evenement_personnalise: string | null;
  max_participants: number | null;
  show_participants_count: boolean | null;
}

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { trackCTAClick } = useCTATracking();

  // Mapping des slugs de solutions aux liens Cal.com
  const getSolutionCalLink = (articleSlug: string): string => {
    const calLinks: Record<string, string> = {
      'collaboria': 'https://cal.com/iarche/presentation-collaboria',
      'datalia': 'https://cal.com/iarche/presentation-datalia',
      'team-5-connect': 'https://cal.com/iarche/presentation-team-5-connect',
      'lexia': 'https://cal.com/iarche/presentation-erp-avocat-booste-a-l-ia',
      'chatbot-rag-avance': 'https://cal.com/iarche/chatbot-rag-avance'
    };
    return calLinks[articleSlug] || '/contact';
  };

  const [article, setArticle] = useState<Article | null>(null);
  const [faq, setFaq] = useState<Array<{ question: string; answer: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [inscriptionsCount, setInscriptionsCount] = useState<number>(0);

  useEffect(() => {
    if (slug) {
      loadArticle();
    }
  }, [slug]);

  useEffect(() => {
    // Track article view
    const trackView = async () => {
      if (article?.id) {
        await supabase.from('article_views').insert({
          article_id: article.id,
        });
      }
    };
    trackView();
    
    // Load FAQ if article is loaded
    if (article?.id) {
      loadFAQ();
    }
    
    // Load inscriptions count for ateliers-webinaires
    if (article?.id && article?.resource_type === 'atelier-webinaire') {
      const loadInscriptionsCount = async () => {
        const { data } = await supabase.rpc('count_atelier_inscriptions', { atelier_uuid: article.id });
        if (typeof data === 'number') {
          setInscriptionsCount(data);
        }
      };
      loadInscriptionsCount();
      
      // Rafraîchir toutes les 10 secondes
      const interval = setInterval(loadInscriptionsCount, 10000);
      return () => clearInterval(interval);
    }
  }, [article?.id]);

  const loadFAQ = async () => {
    if (!article?.id) return;
    
    const { data, error } = await supabase
      .from('faqs')
      .select('questions')
      .eq('article_id', article.id)
      .maybeSingle();

    if (!error && data && data.questions) {
      setFaq(data.questions as unknown as Array<{ question: string; answer: string }>);
    }
  };

  const loadArticle = async () => {
    if (!slug) return;

    setLoading(true);
    
    // Construction de la requête
    let query = supabase
      .from('articles')
      .select('*')
      .eq('slug', slug);
    
    // Si l'utilisateur n'est pas admin, ne montrer que les articles publiés
    if (!isAdmin) {
      query = query.eq('published', true);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      navigate('/404');
    } else {
      setArticle(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getBackPath = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/articles/')) {
      return '/articles';
    } else if (pathname.startsWith('/actualites/')) {
      return '/actualites';
    } else if (pathname.startsWith('/cas-clients/')) {
      return '/cas-clients';
    } else if (pathname.startsWith('/livres-blancs/')) {
      return '/livres-blancs';
    } else if (pathname.startsWith('/ateliers-webinaires/')) {
      return '/ateliers-webinaires';
    } else if (pathname.startsWith('/solutions/')) {
      return '/solutions';
    }
    return '/actualites';
  };

  const getBackLabel = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/articles/')) {
      return 'Retour aux articles';
    } else if (pathname.startsWith('/actualites/')) {
      return 'Retour aux actualités';
    } else if (pathname.startsWith('/cas-clients/')) {
      return 'Retour aux cas clients';
    } else if (pathname.startsWith('/livres-blancs/')) {
      return 'Retour aux livres blancs';
    } else if (pathname.startsWith('/ateliers-webinaires/')) {
      return 'Retour aux ateliers & webinaires';
    } else if (pathname.startsWith('/solutions/')) {
      return 'Retour aux solutions';
    }
    return 'Retour aux actualités';
  };

  const getCanonicalUrl = () => {
    return `https://iarche.fr${location.pathname}`;
  };

  if (loading) {
    return (
      <BackgroundLayout>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </BackgroundLayout>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <BackgroundLayout>
      <Helmet>
        <title>{article.title} · IArche</title>
        <meta
          name="description"
          content={article.excerpt || article.title}
        />
        <link rel="canonical" href={getCanonicalUrl()} />
        <meta property="og:title" content={`${article.title} · IArche`} />
        <meta
          property="og:description"
          content={article.excerpt || article.title}
        />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:type" content="article" />
        {article.cover_image_url && (
          <meta property="og:image" content={article.cover_image_url} />
        )}
        
        {/* Schema.org Article */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "description": article.excerpt || article.title,
            "image": article.cover_image_url || "https://iarche.fr/og-image.png",
            "author": {
              "@type": "Organization",
              "name": "IArche"
            },
            "publisher": {
              "@type": "Organization",
              "name": "IArche",
              "logo": {
                "@type": "ImageObject",
                "url": "https://iarche.fr/logo-iarche.svg"
              }
            },
            "datePublished": article.published_at || article.created_at,
            "dateModified": article.updated_at || article.published_at || article.created_at,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": getCanonicalUrl()
            }
          })}
        </script>
        
        {/* Schema.org FAQPage - Only if FAQ exists */}
        {faq && faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faq.map((item) => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.answer
                }
              }))
            })}
          </script>
        )}

        {/* Schema.org Event - Only for atelier-webinaire */}
        {article.resource_type === 'atelier-webinaire' && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              "name": article.title,
              "description": article.excerpt || article.title,
              "image": article.cover_image_url || "https://iarche.fr/og-image.png",
              "startDate": article.event_date || article.published_at || article.created_at,
              "eventStatus": "https://schema.org/EventScheduled",
              "eventAttendanceMode": article.event_location 
                ? "https://schema.org/OfflineEventAttendanceMode"
                : "https://schema.org/OnlineEventAttendanceMode",
              "location": article.event_location 
                ? {
                    "@type": "Place",
                    "name": article.event_location,
                    "address": {
                      "@type": "PostalAddress",
                      "addressLocality": article.event_location
                    }
                  }
                : {
                    "@type": "VirtualLocation",
                    "url": getCanonicalUrl()
                  },
              "organizer": {
                "@type": "Organization",
                "name": "IArche",
                "url": "https://iarche.fr"
              },
              "performer": {
                "@type": "Organization",
                "name": "IArche"
              },
              "offers": {
                "@type": "Offer",
                "url": getCanonicalUrl(),
                "price": "0",
                "priceCurrency": "EUR",
                "availability": article.registration_open 
                  ? "https://schema.org/InStock" 
                  : "https://schema.org/SoldOut",
                "validFrom": article.published_at || article.created_at
              },
              ...(article.replay_url && {
                "recordedIn": {
                  "@type": "VideoObject",
                  "@id": `${getCanonicalUrl()}#video`,
                  "name": `Replay: ${article.title}`,
                  "description": article.excerpt || article.title,
                  "thumbnailUrl": article.cover_image_url || "https://iarche.fr/og-image.png",
                  "contentUrl": article.replay_url,
                  "embedUrl": article.replay_url,
                  "uploadDate": article.published_at || article.created_at
                }
              })
            })}
          </script>
        )}

        {/* Schema.org VideoObject - Only for atelier-webinaire with replay_url */}
        {article.resource_type === 'atelier-webinaire' && article.replay_url && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "name": `Replay: ${article.title}`,
              "description": article.excerpt || article.title,
              "thumbnailUrl": article.cover_image_url || "https://iarche.fr/og-image.png",
              "uploadDate": article.published_at || article.created_at,
              "contentUrl": article.replay_url,
              "embedUrl": article.replay_url,
              "publisher": {
                "@type": "Organization",
                "name": "IArche",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://iarche.fr/logo-iarche.svg"
                }
              },
              "creator": {
                "@type": "Organization",
                "name": "IArche"
              }
            })}
          </script>
        )}

        {/* Schema.org Book - Only for livre-blanc */}
        {article.resource_type === 'livre-blanc' && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Book",
              "name": article.title,
              "description": article.excerpt || article.title,
              "image": article.cover_image_url || "https://iarche.fr/og-image.png",
              "author": {
                "@type": "Organization",
                "name": "IArche",
                "url": "https://iarche.fr"
              },
              "publisher": {
                "@type": "Organization",
                "name": "IArche",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://iarche.fr/logo-iarche.svg"
                }
              },
              "datePublished": article.published_at || article.created_at,
              "inLanguage": "fr",
              "bookFormat": "https://schema.org/EBook",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "url": getCanonicalUrl()
              },
              "potentialAction": {
                "@type": "ReadAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": article.file_url || getCanonicalUrl(),
                  "actionPlatform": [
                    "https://schema.org/DesktopWebPlatform",
                    "https://schema.org/MobileWebPlatform"
                  ]
                }
              }
            })}
          </script>
        )}

        {/* Schema.org SoftwareApplication - Only for solution */}
        {article.resource_type === 'solution' && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": article.title,
              "description": article.excerpt || article.title,
              "image": article.cover_image_url || "https://iarche.fr/og-image.png",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": article.slug === 'team-5-connect' 
                ? "Web, iOS, Android"
                : "Web",
              "author": {
                "@type": "Organization",
                "name": "IArche",
                "url": "https://iarche.fr"
              },
              "provider": {
                "@type": "Organization",
                "name": "IArche",
                "url": "https://iarche.fr",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://iarche.fr/logo-iarche.svg"
                },
                "contactPoint": {
                  "@type": "ContactPoint",
                  "email": "nlq@iarche.fr",
                  "contactType": "customer service",
                  "availableLanguage": ["French"]
                }
              },
              "offers": {
                "@type": "Offer",
                "price": article.slug === 'datalia' ? "749" : "Sur devis",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "url": getCanonicalUrl(),
                "priceSpecification": article.slug === 'datalia' 
                  ? {
                      "@type": "PriceSpecification",
                      "price": "749",
                      "priceCurrency": "EUR",
                      "valueAddedTaxIncluded": false
                    }
                  : undefined
              },
              "datePublished": article.published_at || article.created_at,
              "dateModified": article.updated_at || article.published_at || article.created_at,
              "inLanguage": "fr",
              "softwareVersion": "1.0",
              "url": getCanonicalUrl()
            })}
          </script>
        )}
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <article className="max-w-[1000px] mx-auto px-6 py-4">
          {/* Image de couverture */}
          {article.cover_image_url ? (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img
                src={article.cover_image_url}
                alt={article.title}
                className="w-full h-auto"
              />
            </div>
          ) : (
            <ArticlePlaceholder className="mb-6 rounded-xl h-56 md:h-72" size="large" />
          )}

          {/* 2. Titre et metadata en haut (avant l'encadré auteur) */}
          <header className="mb-8">
            {!article.published && isAdmin && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ Mode prévisualisation : Cet article n'est pas encore publié. Seuls les admins peuvent le voir.
                </p>
              </div>
            )}
            
            {/* Badge de statut pour les solutions */}
            {article.resource_type === 'solution' && article.tags && article.tags.length > 0 && (
              <div className="mb-4 animate-fadeIn">
                <Badge 
                  variant={article.tags[0] === 'Disponible' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {article.tags[0]}
                </Badge>
              </div>
            )}
            
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-6 animate-fadeIn [animation-delay:0.1s]">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="text-lg text-muted-foreground mb-4 animate-fadeIn [animation-delay:0.2s]">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center justify-between gap-4 animate-fadeIn [animation-delay:0.3s]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {formatDate(article.published_at || article.created_at)}
              </div>
              
              {/* CTA dans le header selon type */}
              {article.resource_type === 'solution' && (
                <GradientLink 
                  href={getSolutionCalLink(article.slug)} 
                  className="text-sm"
                  onClick={() => trackCTAClick('demander_presentation', 'solution_detail_header', article.slug)}
                >
                  Demander une présentation
                </GradientLink>
              )}
              
              {(article.resource_type === 'article' || article.resource_type === 'actualite' || article.resource_type === 'cas-client') && (
                <GradientLink 
                  href="/newsletter" 
                  className="text-sm"
                  onClick={() => trackCTAClick('newsletter_header', `${article.resource_type}_detail_header`, article.slug)}
                >
                  S'inscrire à la Newsletter
                </GradientLink>
              )}
            </div>
            
            {/* Type d'actualité badge */}
            {article.resource_type === 'actualite' && article.actualite_type && (
              <Badge variant="outline" className="mt-2">
                {article.actualite_type === 'annonce' && 'Annonce'}
                {article.actualite_type === 'partenariat' && 'Partenariat'}
                {article.actualite_type === 'evenement' && 'Événement'}
                {article.actualite_type === 'communique' && 'Communiqué'}
              </Badge>
            )}
            
            {/* Date de l'événement si type événement */}
            {article.resource_type === 'actualite' && article.actualite_type === 'evenement' && article.event_date && (
              <div className="flex items-center gap-2 text-sm text-accent mt-2 animate-fadeIn [animation-delay:0.35s]">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <strong>Date de l'événement :</strong> {formatDate(article.event_date)}
              </div>
            )}
          </header>

          {/* Informations cas client - avant le contenu */}
          {article.resource_type === 'cas-client' && (article.secteur_activite || article.taille_entreprise || article.problematique) && (
            <div className="mb-8 p-6 bg-muted/30 border border-border rounded-xl space-y-4 animate-fadeIn [animation-delay:0.4s]">
              {(article.secteur_activite || article.taille_entreprise) && (
                <div className="flex flex-wrap gap-4">
                  {article.secteur_activite && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {article.secteur_activite === 'industrie' && 'Industrie'}
                        {article.secteur_activite === 'services' && 'Services'}
                        {article.secteur_activite === 'sante' && 'Santé'}
                        {article.secteur_activite === 'finance' && 'Finance'}
                        {article.secteur_activite === 'btp' && 'BTP'}
                        {article.secteur_activite === 'transport' && 'Transport'}
                        {article.secteur_activite === 'commerce' && 'Commerce'}
                        {article.secteur_activite === 'autre' && 'Autre'}
                      </Badge>
                    </div>
                  )}
                  {article.taille_entreprise && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {article.taille_entreprise === 'tpe' && 'TPE'}
                        {article.taille_entreprise === 'pme' && 'PME'}
                        {article.taille_entreprise === 'eti' && 'ETI'}
                        {article.taille_entreprise === 'grande-entreprise' && 'Grande entreprise'}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              {article.problematique && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Problématique</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {article.problematique}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Layout avec AuthorCard + TOC (si article) + Contenu */}
          <div className="flex gap-8">
            {/* Contenu principal */}
            <div className="flex-1 min-w-0">
              <div className="flow-root">
                {/* Encadré auteur - float left, visible desktop uniquement */}
                <AuthorCard 
                  showAuthorLabel={
                    article.resource_type === 'article' || 
                    article.resource_type === 'actualite' || 
                    article.resource_type === 'cas-client'
                  }
                />

                {/* 4. Corps du contenu - s'adapte avec l'encadré */}
                <article
                  className="prose prose-lg max-w-none text-left
                    prose-headings:text-foreground prose-headings:text-left
                    prose-h1:text-[32px] prose-h1:font-bold
                    prose-h2:text-[24px] prose-h2:font-semibold
                    prose-p:text-[#374151] prose-p:leading-[1.75] prose-p:text-left
                    prose-a:text-accent hover:prose-a:text-accent/80
                    prose-strong:text-foreground
                    prose-ul:text-[#374151]
                    prose-ol:text-[#374151]
                    prose-blockquote:border-l-accent
                    prose-blockquote:text-muted-foreground
                    animate-fadeIn [animation-delay:0.4s]
                    ql-editor"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
                />
              </div>

              {/* Ressources complémentaires (après le contenu, uniquement pour articles) */}
              {article.resource_type === 'article' && article.ressources_complementaires && (
                <RessourcesComplementaires ressources={article.ressources_complementaires} />
              )}
              
              {/* Source externe (après le contenu, uniquement pour actualités) */}
              {article.resource_type === 'actualite' && article.source_externe && article.source_externe.nom && article.source_externe.url && (
                <div className="mt-8 p-4 bg-muted/30 border border-border rounded-lg animate-fadeIn">
                  <p className="text-sm text-muted-foreground mb-2">Source externe :</p>
                  <a 
                    href={article.source_externe.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent font-medium flex items-center gap-2 transition-colors"
                  >
                    {article.source_externe.nom}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
              
              
              {/* Informations atelier-webinaire (après le contenu) */}
              {article.resource_type === 'atelier-webinaire' && (
                <div className="mt-8 space-y-6 animate-fadeIn">
                  {/* Informations principales */}
                  <div className="p-6 bg-muted/30 border border-border rounded-xl space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Détails de l'événement</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {article.duree_heures && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Durée</span>
                          <span className="text-sm font-medium text-foreground">{article.duree_heures}h</span>
                        </div>
                      )}
                      
                      {article.heure_debut && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Heure de début</span>
                          <span className="text-sm font-medium text-foreground">{article.heure_debut}</span>
                        </div>
                      )}
                      
                      {article.type_evenement && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Type</span>
                          <Badge variant="secondary" className="text-sm w-fit">
                            {article.type_evenement === 'presentiel' && 'Présentiel'}
                            {article.type_evenement === 'webinaire' && 'Webinaire'}
                            {article.type_evenement === 'hybride' && 'Hybride'}
                          </Badge>
                        </div>
                      )}
                      
                      {article.certificat_delivre && (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Certificat</span>
                          <Badge variant="default" className="text-sm w-fit">✓ Certificat délivré</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Prérequis */}
                  {article.prerequis && (
                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Prérequis</h4>
                      <p className="text-base text-muted-foreground leading-relaxed">{article.prerequis}</p>
                    </div>
                  )}
                  
                  {/* Outils requis */}
                  {article.outils_requis && article.outils_requis.length > 0 && (
                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Outils requis</h4>
                      <div className="flex gap-2 flex-wrap">
                        {article.outils_requis.map((outil) => (
                          <Badge key={outil} variant="outline" className="text-sm">{outil}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Programme détaillé */}
                  {article.programme_detaille && Array.isArray(article.programme_detaille) && article.programme_detaille.length > 0 && (
                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Programme détaillé</h4>
                      <div className="space-y-3">
                        {article.programme_detaille.map((item: any, index: number) => (
                          <div key={index} className="flex gap-4 items-start">
                            <span className="text-sm font-medium text-accent min-w-[60px]">{item.heure}</span>
                            <span className="text-sm text-foreground">{item.sujet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Intervenants */}
                  {article.intervenants && Array.isArray(article.intervenants) && article.intervenants.length > 0 && (
                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Intervenants</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {article.intervenants.map((intervenant: any, index: number) => (
                          <div key={index} className="flex gap-4 items-center p-4 bg-background/50 rounded-lg">
                            {intervenant.photo_url && (
                              <img src={intervenant.photo_url} alt={intervenant.nom} className="w-16 h-16 rounded-full object-cover" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-foreground">{intervenant.nom}</p>
                              <p className="text-xs text-muted-foreground">{intervenant.fonction}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Documents à télécharger */}
                  {article.documents_telechargeables && Array.isArray(article.documents_telechargeables) && article.documents_telechargeables.length > 0 && (
                    <div className="p-6 bg-muted/30 border border-border rounded-xl">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Documents à télécharger</h4>
                      <div className="space-y-2">
                        {article.documents_telechargeables.map((doc: any, index: number) => (
                          <a key={index} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:text-accent transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-sm font-medium">{doc.nom}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Table des matières - sidebar droite (uniquement pour articles) */}
            {article.resource_type === 'article' && (
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <TableOfContents content={article.content} />
              </aside>
            )}
          </div>

          {/* Version mobile de l'auteur (horizontal compact) */}
          <div className="md:hidden mt-8 mb-8 p-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl animate-fadeIn">
            <div className="flex items-center gap-4">
              <img 
                src="/logo-iarche.svg" 
                alt="Nicolas LARA"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#E5E7EB] flex-shrink-0"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#111827]">Nicolas LARA</div>
                <div className="text-xs text-[#6B7280]">CEO & Fondateur IArche</div>
              </div>
            </div>
          </div>

          {/* CTA avant FAQ selon type */}
          {article.resource_type === 'solution' && (
            <div className="text-center my-12 animate-fadeIn [animation-delay:0.5s]">
              <GradientLink 
                href={getSolutionCalLink(article.slug)} 
                className="text-lg"
                onClick={() => trackCTAClick('demander_presentation', 'solution_detail_before_faq', article.slug)}
              >
                Demander une présentation
              </GradientLink>
            </div>
          )}
          
          {(article.resource_type === 'article' || article.resource_type === 'actualite' || article.resource_type === 'cas-client') && (
            <div className="text-center my-12 animate-fadeIn [animation-delay:0.5s]">
              <GradientLink 
                href="/contact" 
                className="text-lg"
                onClick={() => trackCTAClick('nous_contacter', `${article.resource_type}_detail_before_faq`, article.slug)}
              >
                Nous contacter
              </GradientLink>
            </div>
          )}

          {/* 4. FAQ (si présente) - APRÈS le CTA */}
          {faq && faq.length > 0 && (
            <div className="mb-12 animate-fadeIn [animation-delay:0.6s]">
              <ArticleFAQ articleId={article.id} />
            </div>
          )}

          {/* 5. CTA - Logique selon resource_type */}
          {article.resource_type === 'solution' ? (
            <div className="my-12">
              <SolutionContactForm solutionName={article.title} />
            </div>
          ) : article.resource_type === 'livre-blanc' ? (
            <div className="my-12 animate-fadeIn [animation-delay:0.6s]">
              <LivreBlancsForm 
                articleId={article.id}
                articleTitle={article.title}
              />
            </div>
          ) : article.resource_type === 'atelier-webinaire' ? (
            <div className="my-12 animate-fadeIn [animation-delay:0.6s]">
              {/* Si inscriptions ouvertes et places disponibles */}
              {article.registration_open && inscriptionsCount < (article.max_participants || 30) ? (
                <AtelierInscriptionForm
                  articleId={article.id}
                  articleTitle={article.title}
                  eventDate={article.event_date}
                  eventLocation={article.event_location}
                  heureDebut={article.heure_debut}
                  typeEvenement={article.type_evenement}
              maxParticipants={article.max_participants || 30}
              inscriptionsCount={inscriptionsCount}
              showParticipantsCount={article.show_participants_count ?? true}
                />
              ) : inscriptionsCount >= (article.max_participants || 30) ? (
                /* Si complet - liste d'attente */
                <div className="text-center p-8 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-lg font-bold text-red-800 mb-2">
                    🚫 Événement complet ({inscriptionsCount}/{article.max_participants || 30} inscrits)
                  </p>
                  <p className="text-sm text-red-700 mb-6">
                    Rejoignez la liste d'attente pour être prévenu en cas de désistement
                  </p>
                  <GradientLink href="/contact" className="text-base">
                    Rejoindre la liste d'attente →
                  </GradientLink>
                </div>
              ) : article.replay_url ? (
                /* Si replay disponible */
                <div className="text-center p-8 bg-primary/5 border-2 border-primary/20 rounded-xl">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    📺 Replay disponible
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Inscriptions fermées - Visionnez le replay de cette session
                  </p>
                  <a href={article.replay_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-base font-medium hero-gradient-text hover:opacity-80 transition-opacity">
                    Voir le replay →
                  </a>
                </div>
              ) : (
                /* Inscriptions fermées sans replay */
                <div className="text-center p-8 bg-muted/30 border border-border rounded-xl">
                  <p className="text-lg font-medium text-muted-foreground">
                    Inscriptions fermées
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center my-12 animate-fadeIn [animation-delay:0.6s]">
              <p className="text-lg text-foreground mb-4">
                Une question sur ce sujet ?
              </p>
              <GradientLink 
                href="/contact" 
                className="text-base"
                onClick={() => trackCTAClick('contactez_nous', `article_detail_${article.resource_type}`, article.slug)}
              >
                Contactez-nous
              </GradientLink>
            </div>
          )}

          {/* 6. Commentaires (allégé) */}
          <div className="mb-12">
            <ArticleComments articleId={article.id} />
          </div>

          {/* 7. Articles similaires */}
          <RelatedArticles 
            currentArticleId={article.id}
            resourceType={article.resource_type}
            tags={article.tags || []}
            limit={3}
          />

          {/* 8. Bouton retour en bas */}
          <div className="pt-8 border-t border-border/30">
            <NavLink to={getBackPath()}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {getBackLabel()}
              </Button>
            </NavLink>
          </div>
        </article>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default ArticleDetail;
