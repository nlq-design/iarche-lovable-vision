import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, RotateCcw, Eye, Calendar } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

interface ArticleVersion {
  id: string;
  version_number: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  created_at: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
}

const ArticleVersionHistory = () => {
  const { id } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (id && user && isAdmin) {
      loadVersions();
    }
  }, [id, user, isAdmin]);

  const loadVersions = async () => {
    if (!id) return;
    
    setLoading(true);

    // Charger l'article actuel
    const { data: articleData } = await supabase
      .from('articles')
      .select('id, title, slug')
      .eq('id', id)
      .single();

    if (articleData) {
      setArticle(articleData);
    }

    // Charger toutes les versions
    const { data, error } = await supabase
      .from('article_versions')
      .select('*')
      .eq('article_id', id)
      .order('version_number', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'historique',
        variant: 'destructive',
      });
    } else {
      setVersions(data || []);
    }
    
    setLoading(false);
  };

  const handleRestore = async (version: ArticleVersion) => {
    if (!confirm(`Restaurer la version ${version.version_number} ? Cette action remplacera la version actuelle.`)) {
      return;
    }

    setRestoringId(version.id);

    const { error } = await supabase
      .from('articles')
      .update({
        title: version.title,
        slug: version.slug,
        excerpt: version.excerpt,
        content: version.content,
        cover_image_url: version.cover_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de restaurer la version',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Version restaurée',
        description: `La version ${version.version_number} a été restaurée avec succès`,
      });
      navigate(`/admin/articles/${id}`);
    }

    setRestoringId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Historique des versions - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <NavLink to={`/admin/articles/${id}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à l'éditeur
                </Button>
              </NavLink>
            </div>
          </div>

          <Card className="bg-background/95 border-border mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                Historique des versions
              </CardTitle>
              {article && (
                <p className="text-muted-foreground mt-2">
                  Article : <strong>{article.title}</strong>
                </p>
              )}
            </CardHeader>
          </Card>

          {versions.length === 0 ? (
            <Card className="bg-background/95 border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Aucune version sauvegardée pour cet article.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Les versions sont créées automatiquement à chaque modification.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card
                  key={version.id}
                  className="bg-background/95 border-border hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                            v{version.version_number}
                          </span>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {version.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              {formatDate(version.created_at)}
                            </div>
                          </div>
                        </div>
                        {version.excerpt && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                            {version.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/actualites/${version.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          disabled={restoringId === version.id}
                        >
                          {restoringId === version.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restaurer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default ArticleVersionHistory;
