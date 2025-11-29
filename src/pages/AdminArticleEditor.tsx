import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Eye } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Switch } from '@/components/ui/switch';

const AdminArticleEditor = () => {
  const { id } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(!!id);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (id && user && isAdmin) {
      loadArticle();
    }
  }, [id, user, isAdmin]);

  const loadArticle = async () => {
    if (!id) return;
    
    setLoadingArticle(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'article',
        variant: 'destructive',
      });
      navigate('/admin');
    } else {
      setTitle(data.title);
      setSlug(data.slug);
      setExcerpt(data.excerpt || '');
      setContent(data.content);
      setCoverImageUrl(data.cover_image_url || '');
      setPublished(data.published);
    }
    setLoadingArticle(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!id) {
      setSlug(generateSlug(value));
    }
  };

  const validateSlug = async (slugToValidate: string) => {
    if (!slugToValidate) {
      setSlugError('Le slug est obligatoire');
      return false;
    }

    // Vérifier si le slug existe déjà
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slugToValidate)
      .maybeSingle();

    if (error) {
      console.error('Error validating slug:', error);
      return true; // Continue si erreur de validation
    }

    // Si un article existe avec ce slug et ce n'est pas celui qu'on édite
    if (data && data.id !== id) {
      setSlugError('Ce slug existe déjà. Choisissez-en un autre.');
      return false;
    }

    setSlugError('');
    return true;
  };

  const handleSlugChange = async (value: string) => {
    const cleanSlug = generateSlug(value);
    setSlug(cleanSlug);
    if (cleanSlug) {
      await validateSlug(cleanSlug);
    } else {
      setSlugError('Le slug est obligatoire');
    }
  };

  const handlePreview = () => {
    if (!slug) {
      toast({
        title: 'Slug manquant',
        description: 'Ajoutez un slug pour prévisualiser l\'article',
        variant: 'destructive',
      });
      return;
    }
    window.open(`/actualites/${slug}`, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Valider le slug avant de sauvegarder
    const isSlugValid = await validateSlug(slug);
    if (!isSlugValid) {
      toast({
        title: 'Slug invalide',
        description: 'Ce slug existe déjà. Choisissez-en un autre.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const articleData = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      cover_image_url: coverImageUrl || null,
      published,
      published_at: published ? new Date().toISOString() : null,
      author_id: user.id,
    };

    if (id) {
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour l\'article',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Article mis à jour',
          description: 'L\'article a été mis à jour avec succès',
        });
        
        // Push GTM event
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'article_updated',
          article_id: id,
          article_title: title,
        });
      }
    } else {
      const { error } = await supabase.from('articles').insert([articleData]);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de créer l\'article',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Article créé',
          description: 'L\'article a été créé avec succès',
        });
        
        // Push GTM event
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push({
          event: 'article_created',
          article_title: title,
        });
        
        navigate('/admin');
      }
    }

    setIsLoading(false);
  };

  if (authLoading || loadingArticle) {
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
        <title>{id ? 'Modifier l\'article' : 'Nouvel article'} - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <NavLink to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </NavLink>
          </div>

          <Card className="bg-background/95 border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                {id ? 'Modifier l\'article' : 'Nouvel article'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL) *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    disabled={isLoading}
                    className={slugError ? 'border-destructive' : ''}
                  />
                  {slugError ? (
                    <p className="text-xs text-destructive">{slugError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      URL: /actualites/{slug}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Extrait</Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={3}
                    disabled={isLoading}
                    placeholder="Court résumé de l'article..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverImageUrl">Image de couverture (URL)</Label>
                  <Input
                    id="coverImageUrl"
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    disabled={isLoading}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu *</Label>
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    className="bg-background"
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'image'],
                        ['clean'],
                      ],
                    }}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={published}
                    onCheckedChange={setPublished}
                    disabled={isLoading}
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Publier l'article
                  </Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading || !!slugError} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {id ? 'Mettre à jour' : 'Créer l\'article'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={isLoading || !slug}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Prévisualiser
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin')}
                    disabled={isLoading}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default AdminArticleEditor;
