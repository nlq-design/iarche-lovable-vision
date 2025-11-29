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
      .order('published_at', { ascending: false });

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
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Livres blancs
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {livresBlancs.map((livreBlanc, index) => (
                <div 
                  key={livreBlanc.id}
                  className="relative rounded-lg p-[2px] gradient-border-animated group invisible animate-fadeIn"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <NavLink
                    to={`/livres-blancs/${livreBlanc.slug}`}
                    className="block"
                  >
                    <Card 
                      className="h-full bg-background border-0 rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-[0_10px_40px_hsla(var(--primary)/0.15)] group-hover:scale-[1.02] group-hover:-translate-y-0.5"
                    >
                    {/* Image de couverture compacte */}
                    {livreBlanc.cover_image_url ? (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={livreBlanc.cover_image_url}
                          alt={livreBlanc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <ArticlePlaceholder className="h-40" />
                    )}

                    <CardHeader className="pb-2">
                      <h2 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        {livreBlanc.title}
                      </h2>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {livreBlanc.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {livreBlanc.excerpt}
                        </p>
                      )}
                      {/* Date discrète en bas */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(livreBlanc.published_at || livreBlanc.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default LivresBlancs;
