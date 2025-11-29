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
import { Loader2, FileText, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import AdminLayout from '@/components/layouts/AdminLayout';


const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        <title>Tableau de bord · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue dans le back-office IArche
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Articles</h3>
                  <p className="text-sm text-muted-foreground">Contenu de fond</p>
                </div>
              </div>
              <NavLink to="/admin/articles">
                <Button variant="outline" className="w-full">
                  Gérer les articles
                </Button>
              </NavLink>
            </CardContent>
          </Card>

          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Actualités</h3>
                  <p className="text-sm text-muted-foreground">Veille tech</p>
                </div>
              </div>
              <NavLink to="/admin/actualites">
                <Button variant="outline" className="w-full">
                  Gérer les actualités
                </Button>
              </NavLink>
            </CardContent>
          </Card>

          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Cas clients</h3>
                  <p className="text-sm text-muted-foreground">Projets réalisés</p>
                </div>
              </div>
              <NavLink to="/admin/cas-clients">
                <Button variant="outline" className="w-full">
                  Gérer les cas clients
                </Button>
              </NavLink>
            </CardContent>
          </Card>

          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Livres blancs</h3>
                  <p className="text-sm text-muted-foreground">Ressources téléchargeables</p>
                </div>
              </div>
              <NavLink to="/admin/livres-blancs">
                <Button variant="outline" className="w-full">
                  Gérer les livres blancs
                </Button>
              </NavLink>
            </CardContent>
          </Card>

          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ateliers & Webinaires</h3>
                  <p className="text-sm text-muted-foreground">Événements</p>
                </div>
              </div>
              <NavLink to="/admin/ateliers-webinaires">
                <Button variant="outline" className="w-full">
                  Gérer les événements
                </Button>
              </NavLink>
            </CardContent>
          </Card>

          <Card className="bg-background border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Redacia</h3>
                  <p className="text-sm text-muted-foreground">Rédaction IA</p>
                </div>
              </div>
              <NavLink to="/admin/redacia">
                <Button variant="outline" className="w-full">
                  Créer avec l'IA
                </Button>
              </NavLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Admin;
