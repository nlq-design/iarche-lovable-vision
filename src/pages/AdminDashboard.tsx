import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, FileText, MessageCircle, Eye, TrendingUp } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

interface ArticleStats {
  id: string;
  title: string;
  slug: string;
  views: number;
  comments: number;
}

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pendingComments: number;
  approvedComments: number;
  totalViews: number;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    pendingComments: 0,
    approvedComments: 0,
    totalViews: 0,
  });
  const [articleStats, setArticleStats] = useState<ArticleStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
    }
  }, [user, isAdmin]);

  const loadStats = async () => {
    setLoading(true);

    try {
      // Statistiques globales des articles
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, published');

      if (articlesError) throw articlesError;

      const totalArticles = articles?.length || 0;
      const publishedArticles = articles?.filter(a => a.published).length || 0;
      const draftArticles = totalArticles - publishedArticles;

      // Statistiques des commentaires
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, approved');

      if (commentsError) throw commentsError;

      const pendingComments = comments?.filter(c => !c.approved).length || 0;
      const approvedComments = comments?.filter(c => c.approved).length || 0;

      // Statistiques des vues totales
      const { count: totalViews, error: viewsError } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true });

      if (viewsError) throw viewsError;

      // Statistiques par article avec vues et commentaires
      const { data: articlesWithDetails, error: detailsError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          published
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (detailsError) throw detailsError;

      // Pour chaque article, récupérer les vues et commentaires
      const articleStatsPromises = (articlesWithDetails || []).map(async (article) => {
        const { count: views } = await supabase
          .from('article_views')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id);

        const { count: comments } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('article_id', article.id)
          .eq('approved', true);

        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          views: views || 0,
          comments: comments || 0,
        };
      });

      const articleStatsData = await Promise.all(articleStatsPromises);
      articleStatsData.sort((a, b) => b.views - a.views);

      setStats({
        totalArticles,
        publishedArticles,
        draftArticles,
        pendingComments,
        approvedComments,
        totalViews: totalViews || 0,
      });
      setArticleStats(articleStatsData);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive',
      });
      console.error('Error loading stats:', error);
    }

    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Tableau de bord - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <NavLink to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au back-office
              </Button>
            </NavLink>
          </div>

          <Card className="bg-background/95 border-border mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                Tableau de bord
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Articles</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalArticles}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.publishedArticles} publiés · {stats.draftArticles} brouillons
                    </p>
                  </div>
                  <FileText className="h-12 w-12 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Commentaires</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.pendingComments + stats.approvedComments}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.pendingComments} en attente · {stats.approvedComments} approuvés
                    </p>
                  </div>
                  <MessageCircle className="h-12 w-12 text-accent opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Vues totales</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalViews}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Toutes les pages d'articles
                    </p>
                  </div>
                  <Eye className="h-12 w-12 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques par article */}
          <Card className="bg-background/95 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5" />
                Top articles (par vues)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {articleStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun article publié
                </p>
              ) : (
                <div className="space-y-3">
                  {articleStats.map((article, index) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-2xl font-bold text-muted-foreground/50 w-8">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <NavLink to={`/actualites/${article.slug}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {article.title}
                            </h3>
                          </NavLink>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-primary">
                            <Eye className="h-4 w-4" />
                            <span className="font-semibold">{article.views}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">vues</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-accent">
                            <MessageCircle className="h-4 w-4" />
                            <span className="font-semibold">{article.comments}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">commentaires</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
