import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';
import GradientTitle from '@/components/ui/GradientTitle';
import ResourceCard from '@/components/ui/ResourceCard';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CasClient {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const CasClients = () => {
  const [casClients, setCasClients] = useState<CasClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const { currentItems, currentPage, totalPages, setPage, nextPage, previousPage } = usePagination({
    items: casClients,
    itemsPerPage: 9,
  });

  useEffect(() => {
    loadCasClients();
  }, []);

  const loadCasClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, created_at')
      .eq('published', true)
      .eq('resource_type', 'cas-client')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des cas clients:', error);
    } else {
      setCasClients(data || []);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/cas-clients" />
        <title>Cas clients IA · IArche · Projets & Réalisations</title>
        <meta name="description" content="Découvrez nos cas clients et projets d'intégration IA réalisés pour des PME. Résultats concrets et retours d'expérience." />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content="cas clients IA, projets IA, réalisations IA, intégration IA PME, success stories" />
        <link rel="canonical" href="https://iarche.fr/cas-clients" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Cas clients IA · IArche · Projets & Réalisations" />
        <meta property="og:description" content="Découvrez nos cas clients et projets d'intégration IA pour PME." />
        <meta property="og:url" content="https://iarche.fr/cas-clients" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cas clients IA · IArche" />
        <meta name="twitter:description" content="Projets d'intégration IA réalisés pour PME." />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />

        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
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
                "name": "Cas clients",
                "item": "https://iarche.fr/cas-clients"
              }
            ]
          })}
        </script>

        {/* Schema.org CollectionPage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Cas clients IA · IArche",
            "description": "Projets d'intégration IA réalisés pour des PME.",
            "url": "https://iarche.fr/cas-clients",
            "isPartOf": { "@type": "WebSite", "name": "IArche", "url": "https://iarche.fr" },
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": casClients.length,
              "itemListElement": casClients.slice(0, 10).map((item, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "url": `https://iarche.fr/cas-clients/${item.slug}`
              }))
            }
          })}
        </script>
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <GradientTitle size="lg" className="mb-6 animate-fadeIn [animation-delay:0.1s]">
              Cas clients
            </GradientTitle>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Projets d'intégration IA et résultats concrets pour nos clients
            </p>
          </div>

          {/* Liste des cas clients */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : casClients.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucun cas client disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((casClient, index) => (
                  <ResourceCard
                    key={casClient.id}
                    id={casClient.id}
                    title={casClient.title}
                    slug={casClient.slug}
                    excerpt={casClient.excerpt}
                    coverImageUrl={casClient.cover_image_url}
                    createdAt={casClient.created_at}
                    basePath="/cas-clients"
                    index={index}
                    showDate={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={previousPage}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={nextPage}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default CasClients;
