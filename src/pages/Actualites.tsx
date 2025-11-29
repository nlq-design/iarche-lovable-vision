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

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const Actualites = () => {
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
      .order('published_at', { ascending: false });

    if (!error && data) {
      setArticles(data);
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

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Actualités IA · IArche · Agence IA Bayonne</title>
        <meta
          name="description"
          content="Actualités, articles et conseils sur l'intelligence artificielle pour les PME. Veille technologique, cas d'usage et réglementation IA."
        />
        <link rel="canonical" href="https://iarche.fr/actualites" />
        <meta property="og:title" content="Actualités IA · IArche · Agence IA Bayonne" />
        <meta
          property="og:description"
          content="Actualités, articles et conseils sur l'intelligence artificielle pour les PME."
        />
        <meta property="og:url" content="https://iarche.fr/actualites" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-20">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Actualités & Articles
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Veille technologique, cas d'usage et réglementation IA
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                Aucun article publié pour le moment.
              </p>
              <p className="text-sm text-muted-foreground">
                Revenez bientôt pour découvrir nos actualités IA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <NavLink
                  key={article.id}
                  to={`/actualites/${article.slug}`}
                  className="group"
                >
                  <Card
                    className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full"
                    style={{
                      visibility: 'hidden',
                      animation: `fadeIn 0.8s ease-out ${0.3 + index * 0.1}s forwards`,
                    }}
                  >
                    {/* Image de couverture */}
                    {article.cover_image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={article.cover_image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">IArche</span>
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                    </CardHeader>

                    <CardContent>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {formatDate(article.published_at || article.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default Actualites;
