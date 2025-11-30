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
import AuthorCard from '@/components/ui/AuthorCard';
import RelatedArticles from '@/components/ui/RelatedArticles';
import { useCTATracking } from '@/hooks/useCTATracking';
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
}

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { trackCTAClick } = useCTATracking();
  const [article, setArticle] = useState<Article | null>(null);
  const [faq, setFaq] = useState<Array<{ question: string; answer: string }>>([]);
  const [loading, setLoading] = useState(true);

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
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fadeIn [animation-delay:0.3s]">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {formatDate(article.published_at || article.created_at)}
            </div>
          </header>

          {/* 3. Layout avec AuthorCard float + Contenu */}
          <div className="flow-root">
            {/* Encadré auteur - float left, visible desktop uniquement */}
            <AuthorCard />

            {/* 4. Corps du contenu - s'adapte avec l'encadré */}
            <div
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

          {/* 4. FAQ (si présente) - AVANT le CTA */}
          {faq && faq.length > 0 && (
            <div className="mb-12 animate-fadeIn [animation-delay:0.5s]">
              <ArticleFAQ articleId={article.id} />
            </div>
          )}

          {/* 5. CTA - Formulaire spécifique pour solutions */}
          {article.resource_type === 'solution' ? (
            <div className="my-12">
              <SolutionContactForm solutionName={article.title} />
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
