import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Eye, History } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import AdminLayout from '@/components/layouts/AdminLayout';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  resource_type: string;
}

const AdminCasClients = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadArticles();
    }
  }, [user, isAdmin]);

  const loadArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, published, published_at, created_at, resource_type')
      .eq('resource_type', 'cas-client')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les cas clients',
        variant: 'destructive',
      });
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cas client ?')) return;

    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le cas client',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Cas client supprimé',
      });
      loadArticles();
    }
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
        <title>Gestion des cas clients - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des cas clients</h1>
            <NavLink to="/admin/articles/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau cas client
              </Button>
            </NavLink>
          </div>

          <div className="space-y-4">
            {articles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucun cas client publié</p>
              </Card>
            ) : (
              articles.map((article) => (
                <Card key={article.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-muted-foreground line-clamp-2 mb-2">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={`px-2 py-1 rounded ${article.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {article.published ? 'Publié' : 'Brouillon'}
                        </span>
                        <span>
                          {new Date(article.published_at || article.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <NavLink to={`/cas-clients/${article.slug}`}>
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </NavLink>
                      <NavLink to={`/admin/articles/${article.id}`}>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </NavLink>
                      <NavLink to={`/admin/articles/${article.id}/history`}>
                        <Button variant="outline" size="icon">
                          <History className="h-4 w-4" />
                        </Button>
                      </NavLink>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCasClients;
