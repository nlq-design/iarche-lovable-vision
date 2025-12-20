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

interface LivreBlanc {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const LivresBlancs = () => {
  const [livresBlancs, setLivresBlancs] = useState<LivreBlanc[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const { currentItems, currentPage, totalPages, setPage, nextPage, previousPage } = usePagination({
    items: livresBlancs,
    itemsPerPage: 9,
  });

  useEffect(() => {
    loadLivresBlancs();
  }, []);

  const loadLivresBlancs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, created_at')
      .eq('published', true)
      .eq('resource_type', 'livre-blanc')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des livres blancs:', error);
    } else {
      setLivresBlancs(data || []);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Livres blancs IA · IArche · Guides & Documentation</title>
        <meta
          name="description"
          content="Téléchargez nos livres blancs sur l'intelligence artificielle pour les PME. Guides complets, méthodologies et bonnes pratiques."
        />
        <link rel="canonical" href="https://iarche.fr/livres-blancs" />
        <meta property="og:title" content="Livres blancs IA · IArche · Guides & Documentation" />
        <meta
          property="og:description"
          content="Livres blancs et guides complets sur l'IA pour les PME."
        />
        <meta property="og:url" content="https://iarche.fr/livres-blancs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        <meta property="og:locale" content="fr_FR" />

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
                "name": "Livres blancs",
                "item": "https://iarche.fr/livres-blancs"
              }
            ]
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
              Livres blancs
            </GradientTitle>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Guides complets, méthodologies et bonnes pratiques IA
            </p>
          </div>

          {/* Liste des livres blancs */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : livresBlancs.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucun livre blanc disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((livreBlanc, index) => (
                  <ResourceCard
                    key={livreBlanc.id}
                    id={livreBlanc.id}
                    title={livreBlanc.title}
                    slug={livreBlanc.slug}
                    excerpt={livreBlanc.excerpt}
                    coverImageUrl={livreBlanc.cover_image_url}
                    createdAt={livreBlanc.created_at}
                    basePath="/livres-blancs"
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

export default LivresBlancs;
