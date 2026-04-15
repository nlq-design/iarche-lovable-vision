import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Eye, History, HelpCircle, FileText, ClipboardCopy, ExternalLink } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useCockpitGeneratedDocuments } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { toast as sonnerToast } from 'sonner';

interface LinkedForm {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  submissions_count: number;
}

interface LinkedDocument {
  id: string;
  title: string;
  version: number;
  status: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  resource_type: string;
  has_faq?: boolean;
  linked_form?: LinkedForm | null;
  linked_document?: LinkedDocument | null;
}

const AdminAteliersWebinaires = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { generateDocument } = useCockpitGeneratedDocuments();

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
      .select(`
        id, 
        title, 
        slug, 
        excerpt, 
        published, 
        published_at, 
        created_at, 
        resource_type,
        faqs!left(id)
      `)
      .eq('resource_type', 'atelier-webinaire')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les ateliers et webinaires',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const articleIds = (data || []).map((a: any) => a.id);

    // Load linked forms
    const { data: formsData } = await supabase
      .from('forms')
      .select('id, slug, title, is_active, submissions_count, article_id')
      .in('article_id', articleIds);

    const formsByArticle = new Map<string, LinkedForm>();
    (formsData || []).forEach((f: any) => {
      if (f.article_id) {
        formsByArticle.set(f.article_id, {
          id: f.id,
          slug: f.slug,
          title: f.title,
          is_active: f.is_active,
          submissions_count: f.submissions_count || 0,
        });
      }
    });

    const articlesWithData = (data || []).map((article: any) => ({
      ...article,
      has_faq: article.faqs && article.faqs.length > 0,
      faqs: undefined,
      linked_form: formsByArticle.get(article.id) || null,
    }));
    setArticles(articlesWithData);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet atelier ou webinaire ?')) return;

    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'atelier ou webinaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Atelier/webinaire supprimé',
      });
      loadArticles();
    }
  };

  const copyFormUrl = (slug: string) => {
    const url = `https://iarche.fr/formulaires/${slug}`;
    navigator.clipboard.writeText(url);
    sonnerToast.success('URL copiée !', { description: url });
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
        <title>Gestion des ateliers & webinaires - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des ateliers & webinaires</h1>
            <NavLink to="/admin/ateliers-webinaires/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel atelier/webinaire
              </Button>
            </NavLink>
          </div>

          <div className="space-y-4">
            {articles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucun atelier ou webinaire publié</p>
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className={`px-2 py-1 rounded ${article.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {article.published ? 'Publié' : 'Brouillon'}
                        </span>
                        {article.has_faq && (
                          <span title="FAQ générée">
                            <HelpCircle className="h-4 w-4 text-accent" />
                          </span>
                        )}
                        <span>
                          {new Date(article.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {/* Linked form info */}
                        {article.linked_form ? (
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                            📋 Formulaire lié ({article.linked_form.submissions_count} réponses)
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs">
                            Aucun formulaire lié
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Form actions */}
                      {article.linked_form ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => navigate(`/admin/formulaires/${article.linked_form!.id}`)}
                            title="Éditer le formulaire"
                          >
                            📋 Formulaire
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyFormUrl(article.linked_form!.slug)}
                            title="Copier l'URL du formulaire"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                          <NavLink to={`/formulaires/${article.linked_form!.slug}`}>
                            <Button variant="outline" size="icon" title="Voir le formulaire public">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </NavLink>
                        </>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={generatingId === article.id}
                        onClick={() => {
                          setGeneratingId(article.id);
                          generateDocument.mutate({
                            article_id: article.id,
                            document_type: 'invitation',
                          }, {
                            onSuccess: (doc) => {
                              setGeneratingId(null);
                              sonnerToast.success('Programme généré !', {
                                action: {
                                  label: 'Voir',
                                  onClick: () => navigate(`/admin/invitation/${doc.id}`),
                                },
                              });
                            },
                            onError: () => {
                              setGeneratingId(null);
                            },
                          });
                        }}
                      >
                        {generatingId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        {generatingId === article.id ? 'Génération...' : 'Programme'}
                      </Button>
                      <NavLink to={`/ateliers-webinaires/${article.slug}`}>
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </NavLink>
                      <NavLink to={`/admin/ateliers-webinaires/${article.id}`}>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </NavLink>
                      <NavLink to={`/admin/ateliers-webinaires/${article.id}/history`}>
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

export default AdminAteliersWebinaires;
