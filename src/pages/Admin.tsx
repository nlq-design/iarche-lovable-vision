import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Eye, History } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadArticles();
    } else if (!authLoading && !user) {
      setLoadingArticles(false);
    }
  }, [user, isAdmin, authLoading]);

  const loadArticles = async () => {
    setLoadingArticles(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, published, published_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les articles',
        variant: 'destructive',
      });
    } else {
      setArticles(data || []);
    }
    setLoadingArticles(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue dans le back-office',
      });
    }
    setIsLoading(false);
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    const { error } = await supabase.from('articles').delete().eq('id', articleId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Article supprimé',
        description: 'L\'article a été supprimé avec succès',
      });
      loadArticles();
    }
  };

  if (authLoading) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackgroundLayout>
    );
  }

  if (!user) {
    return (
      <BackgroundLayout>
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
      </BackgroundLayout>
    );
  }

  if (!isAdmin) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center px-6">
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
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Back-office - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                Back-office IArche
              </h1>
              <p className="text-muted-foreground">
                Gérez vos articles et actualités
              </p>
            </div>
            <NavLink to="/admin/articles/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel article
              </Button>
            </NavLink>
          </div>

          {loadingArticles ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <Card className="bg-background/95 border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Aucun article pour le moment
                </p>
                <NavLink to="/admin/articles/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer le premier article
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="bg-background/95 border-border hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {article.title}
                          </h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              article.published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {article.published ? 'Publié' : 'Brouillon'}
                          </span>
                        </div>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {article.excerpt}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Créé le{' '}
                          {new Date(article.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {article.published && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/actualites/${article.slug}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/admin/articles/${article.id}/history`)}
                          title="Historique des versions"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/admin/articles/${article.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

export default Admin;
