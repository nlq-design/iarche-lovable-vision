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
    } = await query.order('published_at', {
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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

      <main className="min-h-screen pt-8">
        <section className="max-w-6xl mx-auto px-6 py-16">
          {/* En-tête enrichi - Style Premium */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">Actualités</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4 invisible animate-fadeIn [animation-delay:0.2s]">
              Guides pratiques, analyses techniques et retours d'expérience sur l'IA
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground invisible animate-fadeIn [animation-delay:0.3s]">
              <span>{articles.length} {articles.length > 1 ? 'articles' : 'article'}</span>
              <span>·</span>
              <NavLink to="/newsletter" className="text-accent hover:underline">
                S'abonner à la newsletter
              </NavLink>
            </div>
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

          {loading ? <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div> : articles.length === 0 ? <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                Aucun article publié pour le moment.
              </p>
              <p className="text-sm text-muted-foreground">
                Revenez bientôt pour découvrir nos actualités IA.
              </p>
            </div> : (/* Grille 2 colonnes Premium avec large cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {articles.map((article, index) => <NavLink key={article.id} to={`/actualites/${article.slug}`} className="group">
                  <Card className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full" style={{
              visibility: 'hidden',
              animation: `fadeIn 0.8s ease-out ${0.3 + index * 0.1}s forwards`
            }}>
                    {/* Image de couverture plus large */}
                    {article.cover_image_url ? <div className="h-64 overflow-hidden">
                        <img src={article.cover_image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div> : <ArticlePlaceholder className="h-64" />}

                    <CardHeader className="pb-3">
                      <h3 className="text-xl font-semibold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {article.excerpt && <p className="text-base text-muted-foreground line-clamp-4">
                          {article.excerpt}
                        </p>}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" aria-hidden="true" />
                          {formatDate(article.published_at || article.created_at)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.ceil((article.excerpt?.length || 0) / 200)} min de lecture
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </NavLink>)}
            </div>)}
        </section>
      </main>

      <Footer />
    </BackgroundLayout>;
};
export default Actualites;