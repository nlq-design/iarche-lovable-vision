import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { Loader2, Calendar } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const Articles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, created_at')
      .eq('published', true)
      .eq('resource_type', 'actualite')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement des articles:', error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Articles IA · IArche · Agence IA Bayonne</title>
        <meta
          name="description"
          content="Suivez les dernières actualités en intelligence artificielle et découvrez les innovations d'IArche, agence IA à Bayonne. Analyses, tendances et cas d'usage concrets."
        />
        <link rel="canonical" href="https://iarche.fr/articles" />
        <meta property="og:title" content="Articles IA · IArche · Agence IA Bayonne" />
        <meta
          property="og:description"
          content="Actualités IA et innovations IArche : analyses, tendances et cas d'usage concrets pour PME."
        />
        <meta property="og:url" content="https://iarche.fr/articles" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-8">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête dynamique - Style Timeline */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground invisible animate-fadeIn [animation-delay:0.1s]">
                Articles
              </h1>
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full invisible animate-fadeIn [animation-delay:0.2s]">
                Mis à jour quotidiennement
              </span>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.3s]">
              Veille tech, cas d'usage et réglementation IA
            </p>
          </div>

          {/* Liste des articles */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucun article disponible pour le moment.
              </p>
            </div>
          ) : (
            /* Grille 3 colonnes compacte - Style Timeline */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => {
                const isRecent = article.published_at && 
                  new Date(article.published_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                
                return (
                  <NavLink
                    key={article.id}
                    to={`/actualites/${article.slug}`}
                    className="group"
                  >
                    <Card 
                      className="h-full hover:shadow-lg transition-shadow duration-300 bg-background border border-border rounded-lg overflow-hidden invisible animate-fadeIn"
                      style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                    >
                      {/* Badge date proéminent en haut */}
                      <div className="relative">
                        {article.cover_image_url ? (
                          <div className="h-40 overflow-hidden">
                            <img
                              src={article.cover_image_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <ArticlePlaceholder className="h-40" />
                        )}
                        <div className="absolute top-3 right-3 px-3 py-1 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 text-xs font-medium text-foreground shadow-sm">
                          {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                        {isRecent && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-accent text-background text-xs font-bold rounded shadow-sm">
                            NOUVEAU
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        <h2 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                      </CardHeader>

                      <CardContent>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </NavLink>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default Articles;
