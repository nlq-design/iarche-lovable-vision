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
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}
interface Category {
  id: string;
  name: string;
  slug: string;
}
interface Tag {
  id: string;
  name: string;
  slug: string;
}
const Actualites = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Pagination
  const { currentItems, currentPage, totalPages, setPage, nextPage, previousPage } = usePagination({
    items: articles,
    itemsPerPage: 9,
  });
  useEffect(() => {
    loadArticles();
    loadCategoriesAndTags();
  }, []);
  useEffect(() => {
    loadArticles();
  }, [selectedCategory, selectedTag]);
  const loadArticles = async () => {
    setLoading(true);
    let query = supabase.from('articles').select('id, title, slug, excerpt, cover_image_url, published_at, created_at').eq('published', true).eq('resource_type', 'actualite');

    // Apply filters
    if (selectedCategory || selectedTag) {
      const {
        data: filteredArticles
      } = await supabase.from('articles').select(`
          id,
          title,
          slug,
          excerpt,
          cover_image_url,
          published_at,
          created_at,
          article_categories(category_id),
          article_tags(tag_id)
        `).eq('published', true).eq('resource_type', 'actualite');
      if (filteredArticles) {
        const filtered = filteredArticles.filter((article: any) => {
          const matchesCategory = !selectedCategory || article.article_categories?.some((ac: any) => ac.category_id === selectedCategory);
          const matchesTag = !selectedTag || article.article_tags?.some((at: any) => at.tag_id === selectedTag);
          return matchesCategory && matchesTag;
        });
        setArticles(filtered);
      }
      setLoading(false);
      return;
    }
    const {
      data,
      error
    } = await query.order('created_at', {
      ascending: false
    });
    if (!error && data) {
      setArticles(data);
    }
    setLoading(false);
  };
  const loadCategoriesAndTags = async () => {
    const [categoriesResult, tagsResult] = await Promise.all([supabase.from('categories').select('*').order('name'), supabase.from('tags').select('*').order('name')]);
    if (categoriesResult.data) setCategories(categoriesResult.data);
    if (tagsResult.data) setTags(tagsResult.data);
  };
  return <BackgroundLayout>
      <Helmet>
        <title>Actualités IA · IArche · Agence IA Bayonne</title>
        <meta name="description" content="Découvrez nos articles de fond sur l'intelligence artificielle : guides pratiques, analyses techniques et retours d'expérience pour les dirigeants de PME." />
        <link rel="canonical" href="https://iarche.fr/actualites" />
        <meta property="og:title" content="Actualités IA · IArche · Agence IA Bayonne" />
        <meta property="og:description" content="Articles de fond sur l'IA : guides pratiques, analyses techniques et retours d'expérience pour PME." />
        <meta property="og:url" content="https://iarche.fr/actualites" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Actualités
            </h1>
            {/* Ligne décorative gradient */}
            <div className="w-24 h-1 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-60 animate-fadeIn [animation-delay:0.15s]"></div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.3s]">
              Guides pratiques, analyses techniques et retours d'expérience sur l'IA
            </p>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-accent transition-all">
                <option value="">Toutes les catégories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>)}
              </select>

              <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-accent transition-all">
                <option value="">Tous les tags</option>
                {tags.map(tag => <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>)}
              </select>

              {(selectedCategory || selectedTag) && <button onClick={() => {
              setSelectedCategory('');
              setSelectedTag('');
            }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-all">
                  Réinitialiser
                </button>}
            </div>
          </div>

          {/* Liste des actualités */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <ArticlePlaceholder />
              <p className="text-muted-foreground mt-4">
                Aucune actualité disponible pour le moment.
              </p>
            </div>
          ) : (
            <>
              {/* Grille 3 colonnes compacte - Style Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentItems.map((article, index) => (
                <NavLink
                  key={article.id}
                  to={`/actualites/${article.slug}`}
                  className="group"
                >
                  <Card 
                    className="h-full hover:shadow-lg transition-shadow duration-300 bg-background border border-border rounded-lg overflow-hidden animate-fadeIn"
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    {/* Image de couverture compacte */}
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

                    <CardHeader className="pb-2">
                      <h2 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      {/* Date discrète en bas */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(article.created_at).toLocaleDateString('fr-FR', {
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
    </BackgroundLayout>;
};
export default Actualites;