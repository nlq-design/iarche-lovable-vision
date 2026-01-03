import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, MessageCircle, Eye, Users, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { PublicationTrendChart, EngagementPieChart } from '@/components/admin/AnalyticsCharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';


const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // États pour le formulaire de connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour le dashboard (doivent être déclarés inconditionnellement)
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    totalLeads: 0,
    totalViews: 0,
    conversionRate: 0,
    pendingComments: 0,
  });
  const [publicationTrend, setPublicationTrend] = useState<any[]>([]);
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Charger les stats du dashboard quand user est admin
  useEffect(() => {
    if (user && isAdmin) {
      loadDashboardStats();
    }
  }, [user, isAdmin]);

  const loadDashboardStats = async () => {
    try {
      // Articles
      const { data: articles } = await supabase
        .from('articles')
        .select('id, published, created_at');
      
      const totalArticles = articles?.length || 0;
      const publishedArticles = articles?.filter(a => a.published).length || 0;

      // Leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Vues
      const { count: totalViews } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true });

      // Conversion
      const conversionRate = totalViews ? ((totalLeads || 0) / totalViews * 100) : 0;

      // Commentaires en attente
      const { count: pendingComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);

      // Publications 6 derniers mois
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

      // Activité récente
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

      const activity = [
        ...(recentLeads || []).map(l => ({
          id: l.id,
          type: 'lead',
          title: `Nouveau lead: ${l.name}`,
          timestamp: l.created_at,
          source: l.source
        })),
        ...(recentArticles || []).map(a => ({
          id: a.id,
          type: 'article',
          title: `Article publié: ${a.title}`,
          timestamp: a.published_at || ''
        })),
        ...(recentComments || []).map(c => ({
          id: c.id,
          type: 'comment',
          title: `Nouveau commentaire de ${c.author_name}`,
          timestamp: c.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      setStats({
        totalArticles,
        publishedArticles,
        totalLeads: totalLeads || 0,
        totalViews: totalViews || 0,
        conversionRate,
        pendingComments: pendingComments || 0,
      });
      setPublicationTrend(publicationData);
      setLeadsBreakdown(leadsBreakdownData);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setDashboardLoading(false);
  };

  const getActivityIcon = (type: string) => {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Vérifier d'abord si le compte n'est pas verrouillé
      const checkResponse = await supabase.functions.invoke('check-login-attempt', {
        body: { email, success: false, failure_reason: 'pre_check' }
      });

      if (checkResponse.data?.locked) {
        toast({
          title: 'Compte verrouillé',
          description: checkResponse.data.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Tentative de connexion
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Enregistrer la tentative
      await supabase.functions.invoke('check-login-attempt', {
        body: {
          email,
          success: !error,
          failure_reason: error?.message
        }
      });

      if (error) {
        const checkResult = await supabase.functions.invoke('check-login-attempt', {
          body: { email, success: false, failure_reason: 'pre_check' }
        });

        let errorMessage = 'Email ou mot de passe incorrect';
        if (checkResult.data?.attempts_remaining !== undefined) {
          errorMessage += `. ${checkResult.data.attempts_remaining} tentative(s) restante(s)`;
        }
        if (checkResult.data?.warning) {
          errorMessage = checkResult.data.warning;
        }

        toast({
          title: 'Erreur de connexion',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Connexion réussie',
          description: 'Bienvenue dans le back-office',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la connexion',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Helmet>
          <title>Connexion Admin - IArche</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md bg-background/95 border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">Back-office IArche</CardTitle>
              <CardDescription>Connectez-vous pour gérer les articles</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-6">
        <Card className="max-w-md bg-background/95 border-border">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder au back-office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Dashboard - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-8">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Bienvenue, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin'}</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de votre activité • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>

          {dashboardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
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

              {/* Activité récente */}
              <Card className="bg-background/95 border-border">
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
                      {recentActivity.map((activity: any) => (
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
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Admin;
