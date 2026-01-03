import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, MessageCircle, Eye, Users, TrendingUp, PenSquare, Mail, BookOpen, Calendar, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { PublicationTrendChart, EngagementPieChart } from '@/components/admin/AnalyticsCharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalLeads: number;
  totalViews: number;
  conversionRate: number;
  pendingComments: number;
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'article' | 'comment';
  title: string;
  timestamp: string;
  source?: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalLeads: 0,
    totalViews: 0,
    conversionRate: 0,
    pendingComments: 0,
  });
  const [publicationTrend, setPublicationTrend] = useState<any[]>([]);
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
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
      // Statistiques des articles
      const { data: articles } = await supabase
        .from('articles')
        .select('id, published, created_at');
      
      const totalArticles = articles?.length || 0;
      const publishedArticles = articles?.filter(a => a.published).length || 0;
      const draftArticles = totalArticles - publishedArticles;

      // Statistiques des leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Statistiques des vues totales
      const { count: totalViews } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true });

      // Taux de conversion (leads / vues * 100)
      const conversionRate = totalViews ? ((totalLeads || 0) / totalViews * 100) : 0;

      // Commentaires en attente
      const { count: pendingComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);

      // Publications des 30 derniers jours (par mois pour le graphique)
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subDays(new Date(), i * 30);
        return format(date, 'MMM', { locale: fr });
      }).reverse();

      const publicationData = await Promise.all(
        last6Months.map(async (month, index) => {
          const startDate = subDays(new Date(), (5 - index + 1) * 30);
          const endDate = subDays(new Date(), (5 - index) * 30);
          
          const { count } = await supabase
            .from('articles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString())
            .lt('created_at', endDate.toISOString());

          return { month, articles: count || 0 };
        })
      );

      // Leads par source
      const { data: leadsData } = await supabase
        .from('leads')
        .select('source');

      const leadsBySource = leadsData?.reduce((acc: any, lead) => {
        const source = lead.source || 'autre';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const leadsBreakdownData = Object.entries(leadsBySource || {}).map(([name, value]) => ({
        name: name === 'livre-blanc' ? 'Livres blancs' :
              name === 'atelier-webinaire' ? 'Ateliers' :
              name === 'newsletter' ? 'Newsletter' :
              name === 'contact' ? 'Contact' : 'Autre',
        value
      }));

      // Activité récente (derniers 10 événements)
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('id, name, source, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentArticles } = await supabase
        .from('articles')
        .select('id, title, published_at')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);

      const { data: recentComments } = await supabase
        .from('comments')
        .select('id, author_name, created_at')
        .eq('approved', false)
        .order('created_at', { ascending: false })
        .limit(2);

      const activity: RecentActivity[] = [
        ...(recentLeads || []).map(l => ({
          id: l.id,
          type: 'lead' as const,
          title: `Nouveau lead: ${l.name}`,
          timestamp: l.created_at,
          source: l.source
        })),
        ...(recentArticles || []).map(a => ({
          id: a.id,
          type: 'article' as const,
          title: `Article publié: ${a.title}`,
          timestamp: a.published_at || ''
        })),
        ...(recentComments || []).map(c => ({
          id: c.id,
          type: 'comment' as const,
          title: `Nouveau commentaire de ${c.author_name}`,
          timestamp: c.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      setStats({
        totalArticles,
        publishedArticles,
        draftArticles,
        totalLeads: totalLeads || 0,
        totalViews: totalViews || 0,
        conversionRate,
        pendingComments: pendingComments || 0,
      });
      setPublicationTrend(publicationData);
      setLeadsBreakdown(leadsBreakdownData);
      setRecentActivity(activity);
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

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'lead':
        return <Users className="h-4 w-4 text-accent" />;
      case 'article':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'il y a moins d\'1h';
    if (diffInHours < 24) return `il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `il y a ${diffInDays}j`;
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Dashboard - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-8">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Header avec message de bienvenue */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Bienvenue, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin'}</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de votre activité • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>

          {/* KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Articles</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalArticles}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {stats.publishedArticles} publiés
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-primary opacity-40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Leads</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalLeads}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Toutes sources
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-accent opacity-40" />
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
                      Depuis le début
                    </p>
                  </div>
                  <Eye className="h-10 w-10 text-primary opacity-40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/95 border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conversion</p>
                    <p className="text-3xl font-bold text-foreground">{stats.conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Leads / Vues
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-accent opacity-40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-background/95 border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Publications (6 derniers mois)</CardTitle>
                <CardDescription>Evolution du nombre d'articles publiés</CardDescription>
              </CardHeader>
              <CardContent>
                <PublicationTrendChart data={publicationTrend} />
              </CardContent>
            </Card>

            <Card className="bg-background/95 border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Leads par source</CardTitle>
                <CardDescription>Répartition des leads par canal d'acquisition</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementPieChart data={leadsBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions + Activité récente */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="bg-background/95 border-border lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <NavLink to="/admin/redacia">
                  <Button variant="outline" className="w-full justify-start">
                    <PenSquare className="mr-3 h-4 w-4" />
                    Nouveau contenu
                  </Button>
                </NavLink>
                <NavLink to="/admin/leads">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-3 h-4 w-4" />
                    Voir les leads
                  </Button>
                </NavLink>
                <NavLink to="/admin/advanced-stats">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="mr-3 h-4 w-4" />
                    Analytics avancées
                  </Button>
                </NavLink>
                <NavLink to="/admin/newsletters">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="mr-3 h-4 w-4" />
                    Newsletter
                  </Button>
                </NavLink>
                <NavLink to="/admin/parametres-securite">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-3 h-4 w-4" />
                    Paramètres
                  </Button>
                </NavLink>
              </CardContent>
            </Card>

            {/* Activité récente */}
            <Card className="bg-background/95 border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Activité récente</CardTitle>
                <CardDescription>
                  {stats.pendingComments > 0 && (
                    <span className="text-accent font-medium">
                      {stats.pendingComments} commentaire{stats.pendingComments > 1 ? 's' : ''} en attente
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune activité récente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-1">
                            {activity.title}
                          </p>
                          {activity.source && (
                            <p className="text-xs text-muted-foreground">
                              Source: {activity.source}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
