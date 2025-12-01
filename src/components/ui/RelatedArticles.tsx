import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import { Calendar } from 'lucide-react';
import { Card } from './card';

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string;
  resource_type: string;
}

interface RelatedArticlesProps {
  currentArticleId: string;
  resourceType: string;
  tags?: string[];
  limit?: number;
}

const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  currentArticleId,
  resourceType,
  tags = [],
  limit = 3
}) => {
  const [articles, setArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedArticles();
  }, [currentArticleId, resourceType, tags]);

  const loadRelatedArticles = async () => {
    try {
      setLoading(true);

      // Stratégie 1: Articles du même resource_type avec tags communs
      let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, cover_image_url, published_at, resource_type')
        .eq('published', true)
        .eq('resource_type', resourceType)
        .neq('id', currentArticleId)
        .order('published_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      setArticles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des articles similaires:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoutePrefix = (type: string) => {
    const routes: { [key: string]: string } = {
      'actualite': '/actualites',
      'article': '/articles',
      'cas-client': '/cas-clients',
      'livre-blanc': '/livres-blancs',
      'atelier-webinaire': '/ateliers-webinaires',
      'solution': '/solutions'
    };
    return routes[type] || '/actualites';
  };

  if (loading || articles.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 mb-12">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-semibold text-primary mb-2 text-center">
          Articles similaires
        </h2>
        <div className="w-20 h-1 mx-auto mb-8 rounded-full bg-gradient-to-r from-primary via-accent to-primary"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <NavLink
              key={article.id}
              to={`${getRoutePrefix(article.resource_type)}/${article.slug}`}
              className="block group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden invisible animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {article.cover_image_url && (
                  <div className="w-full h-40 overflow-hidden">
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-5">
                  <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    <time dateTime={article.published_at}>
                      {formatDate(article.published_at)}
                    </time>
                  </div>
                </div>
              </Card>
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedArticles;
