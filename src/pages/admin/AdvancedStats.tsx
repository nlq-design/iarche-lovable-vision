import { useState, useEffect, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Users, FileText, MessageCircle, Eye } from 'lucide-react';
import { MiniChartSkeleton } from '@/components/admin/ChartSkeleton';

// Lazy load heavy chart components
const PublicationTrendChart = lazy(() => import('@/components/admin/AnalyticsCharts').then(m => ({ default: m.PublicationTrendChart })));
const EngagementPieChart = lazy(() => import('@/components/admin/AnalyticsCharts').then(m => ({ default: m.EngagementPieChart })));
const TopArticlesBarChart = lazy(() => import('@/components/admin/AnalyticsCharts').then(m => ({ default: m.TopArticlesBarChart })));

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalComments: number;
  totalSubscribers: number;
  approvedComments: number;
}

interface PublicationTrend {
  month: string;
  articles: number;
}

interface EngagementData {
  name: string;
  value: number;
}

const COLORS = ['#1A2B4A', '#B04A32', '#4A90E2', '#50C878'];

const AdvancedStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [publicationTrends, setPublicationTrends] = useState<PublicationTrend[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [topArticles, setTopArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAdvancedStats();
  }, []);

  const loadAdvancedStats = async () => {
    setIsLoading(true);
    try {
      // Statistiques générales
      const [articlesData, viewsData, commentsData, subscribersData] = await Promise.all([
        supabase.from('articles').select('*', { count: 'exact', head: false }),
        supabase.from('article_views').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: false }),
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
      ]);

      if (articlesData.error || viewsData.error || commentsData.error || subscribersData.error) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const published = articlesData.data?.filter(a => a.published).length || 0;
      const approved = commentsData.data?.filter(c => c.approved).length || 0;

      setStats({
        totalArticles: articlesData.data?.length || 0,
        publishedArticles: published,
        totalViews: viewsData.count || 0,
        totalComments: commentsData.data?.length || 0,
        totalSubscribers: subscribersData.count || 0,
        approvedComments: approved
      });

      // Tendances de publication (6 derniers mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: recentArticles } = await supabase
        .from('articles')
        .select('published_at')
        .gte('published_at', sixMonthsAgo.toISOString())
        .eq('published', true)
        .order('published_at', { ascending: true });

      const monthlyData: { [key: string]: number } = {};
      recentArticles?.forEach(article => {
        if (article.published_at) {
          const date = new Date(article.published_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
      });

      const trends = Object.entries(monthlyData).map(([month, articles]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        articles
      }));
      setPublicationTrends(trends);

      // Données d'engagement
      setEngagementData([
        { name: 'Vues', value: viewsData.count || 0 },
        { name: 'Commentaires', value: commentsData.data?.length || 0 },
        { name: 'Abonnés', value: subscribersData.count || 0 }
      ]);

      // Top 10 articles
      const { data: viewsWithArticles } = await supabase
        .from('article_views')
        .select('article_id, articles(id, title, slug)')
        .order('viewed_at', { ascending: false });

      const articleViewCounts: { [key: string]: { title: string; slug: string; views: number } } = {};
      viewsWithArticles?.forEach(view => {
        const article = view.articles as any;
        if (article && article.id) {
          if (!articleViewCounts[article.id]) {
            articleViewCounts[article.id] = { title: article.title, slug: article.slug, views: 0 };
          }
          articleViewCounts[article.id].views += 1;
        }
      });

      const sortedArticles = Object.entries(articleViewCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setTopArticles(sortedArticles);

    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const avgViewsPerArticle = stats ? Math.round(stats.totalViews / Math.max(stats.publishedArticles, 1)) : 0;
  const avgCommentsPerArticle = stats ? (stats.totalComments / Math.max(stats.publishedArticles, 1)).toFixed(1) : 0;
  const commentApprovalRate = stats ? Math.round((stats.approvedComments / Math.max(stats.totalComments, 1)) * 100) : 0;

  return (
    <AdminLayout>
      <Helmet>
        <title>Statistiques Avancées · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Statistiques Avancées</h1>
          <p className="text-muted-foreground">Évolution des publications et taux d'engagement</p>
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Articles publiés</p>
                  <p className="text-2xl font-bold">{stats?.publishedArticles}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total vues</p>
                  <p className="text-2xl font-bold">{stats?.totalViews}</p>
                  <p className="text-xs text-muted-foreground mt-1">~{avgViewsPerArticle} / article</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commentaires</p>
                  <p className="text-2xl font-bold">{stats?.totalComments}</p>
                  <p className="text-xs text-muted-foreground mt-1">{commentApprovalRate}% approuvés</p>
                </div>
                <MessageCircle className="h-8 w-8 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abonnés</p>
                  <p className="text-2xl font-bold">{stats?.totalSubscribers}</p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tendance publications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Évolution des publications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<MiniChartSkeleton />}>
                <PublicationTrendChart data={publicationTrends} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Répartition engagement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Répartition de l'engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<MiniChartSkeleton />}>
                <EngagementPieChart data={engagementData} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Top articles */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 des articles les plus vus</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<MiniChartSkeleton />}>
              <TopArticlesBarChart data={topArticles} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdvancedStats;
