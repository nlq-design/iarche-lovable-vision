import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { Loader2, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    loadFilters();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, selectedTag]);

  const loadFilters = async () => {
    // Charger les catégories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name');
    setCategories(categoriesData || []);

    // Charger les tags
    const { data: tagsData } = await supabase
      .from('tags')
      .select('id, name, slug')
      .order('name');
    setTags(tagsData || []);
  };

  const loadArticles = async () => {
    setLoading(true);
    
    let query = supabase
      .from('articles')
      .select(`
        id, 
        title, 
        slug, 
        excerpt, 
        cover_image_url, 
        published_at, 
        created_at,
        article_categories(category_id),
        article_tags(tag_id)
      `)
      .eq('published', true);

    // Filtre par catégorie
    if (selectedCategory) {
      const { data: articleIds } = await supabase
        .from('article_categories')
        .select('article_id')
        .eq('category_id', selectedCategory);
      
      const ids = articleIds?.map(ac => ac.article_id) || [];
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        // Aucun article dans cette catégorie
        setArticles([]);
        setLoading(false);
        return;
      }
    }

    // Filtre par tag
    if (selectedTag) {
      const { data: articleIds } = await supabase
        .from('article_tags')
        .select('article_id')
        .eq('tag_id', selectedTag);
      
      const ids = articleIds?.map(at => at.article_id) || [];
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        // Aucun article avec ce tag
        setArticles([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query.order('published_at', { ascending: false });

    if (!error && data) {
      setArticles(data);
    }
    setLoading(false);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedTag('');
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
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 invisible animate-fadeIn [animation-delay:0.1s]">
              Actualités & Articles
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto invisible animate-fadeIn [animation-delay:0.2s]">
              Veille technologique, cas d'usage et réglementation IA
            </p>
          </div>

          {/* Filtres */}
          <div className="mb-8 flex flex-wrap items-center gap-4 p-4 bg-background/50 border border-border rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-2 block">
                Catégorie
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-[100]">
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-2 block">
                Tag
              </label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Tous les tags" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-[100]">
                  <SelectItem value="all">Tous les tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedCategory || selectedTag) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-6"
                >
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              </div>
            )}
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
