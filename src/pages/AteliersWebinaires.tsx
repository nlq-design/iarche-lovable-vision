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
import GradientTitle from '@/components/ui/GradientTitle';
import LogoArc from '@/components/ui/LogoArc';
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
  type_evenement: string | null;
  event_location: string | null;
  event_date: string | null;
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
      .select('id, title, slug, excerpt, cover_image_url, published_at, created_at, max_participants, registration_open, show_participants_count, type_evenement, event_location, event_date')
      .eq('published', true)
      .eq('resource_type', 'atelier-webinaire');
    
    if (error) {
      console.error('Erreur lors du chargement des ateliers:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      setAteliersWebinaires([]);
      setLoading(false);
      return;
    }

    // Séparer les événements à venir et passés
    const now = new Date();
    const upcoming: AtelierWebinaire[] = [];
    const past: AtelierWebinaire[] = [];

    for (const item of data) {
      const eventDate = item.event_date ? new Date(item.event_date) : null;
      
      // Récupérer le nombre d'inscriptions
      const { data: countData } = await supabase.rpc('count_atelier_inscriptions', { 
        atelier_uuid: item.id 
      });
      
      const articleWithCount = {
        ...item,
        inscriptions_count: countData || 0
      };

      if (eventDate && eventDate >= now) {
        upcoming.push(articleWithCount);
      } else {
        past.push(articleWithCount);
      }
    }

    // Trier les événements à venir du plus proche au plus lointain
    upcoming.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return dateA - dateB; // Croissant
    });

    // Trier les événements passés du plus récent au plus ancien
    past.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return dateB - dateA; // Décroissant
    });

    // Combiner : à venir d'abord, puis passés
    const sortedData = [...upcoming, ...past];

    setAteliersWebinaires(sortedData);
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
                "name": "Ateliers & Webinaires",
                "item": "https://iarche.fr/ateliers-webinaires"
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
              Ateliers & Webinaires
            </GradientTitle>
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
                    className="h-full hover:shadow-md transition-all duration-300 bg-background border border-border/60 rounded-lg overflow-hidden animate-fadeIn"
                    style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  >
                    {/* Image de couverture */}
                    {item.cover_image_url ? (
                      <div className="h-36 overflow-hidden">
                        <img
                          src={item.cover_image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <ArticlePlaceholder className="h-36" />
                    )}

                    <CardHeader className="pb-2 pt-4">
                      <GradientTitle size="sm" as="h2" centered={false} textClassName="line-clamp-2 text-base" showArc={false}>
                        {item.title}
                      </GradientTitle>
                      {/* v4.0: Arc supprimé des cards */}
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {item.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.excerpt}
                        </p>
                      )}
                      
                      {/* Date de l'événement */}
                      {item.event_date && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          {new Date(item.event_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                          {/* Badge événement passé */}
                          {new Date(item.event_date) < new Date() && (
                            <Badge variant="secondary" className="ml-2">
                              {item.type_evenement === 'webinaire' ? 'Replay' : 'Terminé'}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Type d'événement */}
                      {item.type_evenement && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.type_evenement === 'presentiel' && 'Présentiel'}
                          {item.type_evenement === 'webinaire' && 'Webinaire'}
                          {item.type_evenement === 'hybride' && 'Hybride'}
                        </Badge>
                      )}
                      
                      {/* Lieu pour présentiel */}
                      {item.type_evenement === 'presentiel' && item.event_location && (
                        <p className="text-xs text-muted-foreground">
                          {item.event_location}
                        </p>
                      )}
                      
                      {/* Compteur d'inscrits - uniquement pour événements à venir */}
                      {item.event_date && new Date(item.event_date) >= new Date() && item.show_participants_count && item.max_participants && item.inscriptions_count !== undefined && (
                        <Badge 
                          variant={item.inscriptions_count >= item.max_participants ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {item.inscriptions_count >= item.max_participants 
                            ? `Complet (${item.inscriptions_count}/${item.max_participants})` 
                            : `${item.inscriptions_count}/${item.max_participants} · ${item.max_participants - item.inscriptions_count} places restantes`
                          }
                        </Badge>
                      )}
                      
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
