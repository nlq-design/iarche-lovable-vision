import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { Loader2, Calendar } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface AtelierWebinaire {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  max_participants: number | null;
  registration_open: boolean | null;
  show_participants_count: boolean | null;
  inscriptions_count?: number;
}

const AteliersWebinaires = () => {
  const [ateliersWebinaires, setAteliersWebinaires] = useState<AtelierWebinaire[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const { currentItems, currentPage, totalPages, setPage, nextPage, previousPage } = usePagination({
    items: ateliersWebinaires,
    itemsPerPage: 9,
  });

  useEffect(() => {
    loadAteliersWebinaires();
  }, []);

  const loadAteliersWebinaires = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, created_at, max_participants, registration_open, show_participants_count')
      .eq('published', true)
      .eq('resource_type', 'atelier-webinaire')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des ateliers et webinaires:', error);
      setAteliersWebinaires([]);
    } else {
      // Charger le compteur pour chaque atelier
      const ateliersWithCount = await Promise.all((data || []).map(async (atelier) => {
        const { data: countData } = await supabase.rpc('count_atelier_inscriptions', { atelier_uuid: atelier.id });
        return {
          ...atelier,
          inscriptions_count: typeof countData === 'number' ? countData : 0
        };
      }));
      setAteliersWebinaires(ateliersWithCount);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Ateliers & Webinaires IA · IArche · Formation & Événements</title>
        <meta
          name="description"
          content="Participez à nos ateliers et webinaires sur l'intelligence artificielle. Formations pratiques, démonstrations et sessions Q&A."
        />
        <link rel="canonical" href="https://iarche.fr/ateliers-webinaires" />
        <meta property="og:title" content="Ateliers & Webinaires IA · IArche · Formation & Événements" />
        <meta
          property="og:description"
          content="Ateliers et webinaires sur l'IA pour les PME."
        />
        <meta property="og:url" content="https://iarche.fr/ateliers-webinaires" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Ateliers & Webinaires
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Formations pratiques, démonstrations et sessions Q&A sur l'IA
            </p>
          </div>

          {/* Liste des ateliers et webinaires */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : ateliersWebinaires.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucun atelier ou webinaire disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((item, index) => (
                <NavLink
                  key={item.id}
                  to={`/ateliers-webinaires/${item.slug}`}
                  className="group"
                >
                  <Card 
                    className="h-full hover:shadow-lg transition-shadow duration-300 bg-background border border-border rounded-lg overflow-hidden animate-fadeIn"
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    {/* Image de couverture compacte */}
                    {item.cover_image_url ? (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={item.cover_image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <ArticlePlaceholder className="h-40" />
                    )}

                    <CardHeader className="pb-2">
                      <h2 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        {item.title}
                      </h2>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {item.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.excerpt}
                        </p>
                      )}
                      
                      {/* Badge Complet si places atteintes et visibilité activée */}
                      {item.show_participants_count && item.max_participants && item.inscriptions_count !== undefined && item.inscriptions_count >= item.max_participants && (
                        <Badge variant="destructive" className="text-xs">
                          🚫 COMPLET ({item.inscriptions_count}/{item.max_participants})
                        </Badge>
                      )}
                      
                      {/* Places disponibles si pas complet et visibilité activée */}
                      {item.show_participants_count && item.max_participants && item.inscriptions_count !== undefined && item.inscriptions_count < item.max_participants && item.registration_open && (
                        <Badge variant="secondary" className="text-xs">
                          {item.max_participants - item.inscriptions_count} places disponibles
                        </Badge>
                      )}
                      
                      {/* Date discrète en bas */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(item.published_at || item.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>
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

export default AteliersWebinaires;
