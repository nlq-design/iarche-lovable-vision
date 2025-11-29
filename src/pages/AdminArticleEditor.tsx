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
import { Loader2, ArrowLeft, Save, Eye, History, Calendar as CalendarIcon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const [scheduledPublishAt, setScheduledPublishAt] = useState<Date | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);

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

  useEffect(() => {
    if (user && isAdmin) {
      loadCategoriesAndTags();
    }
  }, [user, isAdmin]);

  const loadCategoriesAndTags = async () => {
    // Charger les catégories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    setAvailableCategories(categories || []);

    // Charger les tags
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name')
      .order('name');
    setAvailableTags(tags || []);
  };

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
      setScheduledPublishAt(data.scheduled_publish_at ? new Date(data.scheduled_publish_at) : undefined);

      // Charger les catégories de l'article
      const { data: articleCategories } = await supabase
        .from('article_categories')
        .select('category_id')
        .eq('article_id', id);
      setSelectedCategories(articleCategories?.map(ac => ac.category_id) || []);

      // Charger les tags de l'article
      const { data: articleTags } = await supabase
        .from('article_tags')
        .select('tag_id')
        .eq('article_id', id);
      setSelectedTags(articleTags?.map(at => at.tag_id) || []);
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

  const handleTitleChange = async (value: string) => {
    setTitle(value);
    if (!id) {
      const baseSlug = generateSlug(value);
      const availableSlug = await findAvailableSlug(baseSlug);
      setSlug(availableSlug);
      if (availableSlug !== baseSlug) {
        toast({
          title: 'Slug modifié',
          description: `Le slug "${baseSlug}" existe déjà. Utilisation de "${availableSlug}" à la place.`,
        });
      }
    }
  };

  const findAvailableSlug = async (baseSlug: string): Promise<string> => {
    let testSlug = baseSlug;
    let counter = 2;
    
    while (true) {
      const { data, error } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', testSlug)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking slug:', error);
        return testSlug;
      }
      
      // Si le slug n'existe pas ou c'est notre article actuel, on peut l'utiliser
      if (!data || data.id === id) {
        return testSlug;
      }
      
      // Sinon, essayer avec un suffixe
      testSlug = `${baseSlug}-${counter}`;
      counter++;
      
      // Sécurité: arrêter après 100 tentatives
      if (counter > 100) {
        return `${baseSlug}-${Date.now()}`;
      }
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
      return true;
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
    
    if (!cleanSlug) {
      setSlugError('Le slug est obligatoire');
      return;
    }
    
    // Vérifier si le slug existe
    const isValid = await validateSlug(cleanSlug);
    
    // Si le slug existe déjà et n'est pas valide, proposer un slug alternatif
    if (!isValid) {
      const availableSlug = await findAvailableSlug(cleanSlug);
      if (availableSlug !== cleanSlug) {
        toast({
          title: 'Slug modifié',
          description: `Le slug "${cleanSlug}" existe déjà. Suggestion : "${availableSlug}"`,
        });
      }
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
      scheduled_publish_at: scheduledPublishAt ? scheduledPublishAt.toISOString() : null,
      author_id: user.id,
    };

    if (id) {
      // Sauvegarder une version avant la mise à jour
      const { data: currentArticle } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (currentArticle) {
        // Obtenir le dernier numéro de version
        const { data: lastVersion } = await supabase
          .from('article_versions')
          .select('version_number')
          .eq('article_id', id)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

        // Créer une nouvelle version
        await supabase.from('article_versions').insert([{
          article_id: id,
          version_number: nextVersionNumber,
          title: currentArticle.title,
          slug: currentArticle.slug,
          excerpt: currentArticle.excerpt,
          content: currentArticle.content,
          cover_image_url: currentArticle.cover_image_url,
          author_id: user.id,
        }]);
      }

      // Check if article is being published for the first time
      const wasUnpublished = currentArticle && !currentArticle.published;
      const isBeingPublished = published && wasUnpublished;

      // Mettre à jour l'article
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
        // Mettre à jour les catégories
        await supabase.from('article_categories').delete().eq('article_id', id);
        if (selectedCategories.length > 0) {
          await supabase.from('article_categories').insert(
            selectedCategories.map(catId => ({ article_id: id, category_id: catId }))
          );
        }

        // Mettre à jour les tags
        await supabase.from('article_tags').delete().eq('article_id', id);
        if (selectedTags.length > 0) {
          await supabase.from('article_tags').insert(
            selectedTags.map(tagId => ({ article_id: id, tag_id: tagId }))
          );
        }

        // Send newsletter if article is being published for the first time
        if (isBeingPublished) {
          try {
            await supabase.functions.invoke('send-newsletter', {
              body: { articleId: id }
            });
            toast({
              title: 'Newsletter envoyée',
              description: 'Les abonnés ont été notifiés du nouvel article',
            });
          } catch (newsletterError) {
            console.error('Newsletter send error:', newsletterError);
          }
        }

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
      const { data: newArticle, error } = await supabase
        .from('articles')
        .insert([articleData])
        .select()
        .single();

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de créer l\'article',
          variant: 'destructive',
        });
      } else {
        // Ajouter les catégories
        if (selectedCategories.length > 0) {
          await supabase.from('article_categories').insert(
            selectedCategories.map(catId => ({ article_id: newArticle.id, category_id: catId }))
          );
        }

        // Ajouter les tags
        if (selectedTags.length > 0) {
          await supabase.from('article_tags').insert(
            selectedTags.map(tagId => ({ article_id: newArticle.id, tag_id: tagId }))
          );
        }

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
          <div className="mb-8 flex items-center justify-between">
            <NavLink to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            </NavLink>
            {id && (
              <NavLink to={`/admin/articles/${id}/history`}>
                <Button variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  Historique
                </Button>
              </NavLink>
            )}
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

                <div className="space-y-3">
                  <Label>Catégories</Label>
                  {availableCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune catégorie disponible.{' '}
                      <NavLink to="/admin/categories" className="text-primary hover:underline">
                        Créer une catégorie
                      </NavLink>
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableCategories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, category.id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                              }
                            }}
                            disabled={isLoading}
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Tags</Label>
                  {availableTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun tag disponible.{' '}
                      <NavLink to="/admin/tags" className="text-primary hover:underline">
                        Créer un tag
                      </NavLink>
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableTags.map((tag) => (
                        <div key={tag.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag.id]);
                              } else {
                                setSelectedTags(selectedTags.filter(id => id !== tag.id));
                              }
                            }}
                            disabled={isLoading}
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {tag.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
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
                    onCheckedChange={(checked) => {
                      setPublished(checked);
                      if (checked) setScheduledPublishAt(undefined);
                    }}
                    disabled={isLoading}
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Publier l'article immédiatement
                  </Label>
                </div>

                {!published && (
                  <div className="space-y-2">
                    <Label>Publication programmée (optionnel)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !scheduledPublishAt && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledPublishAt ? (
                            format(scheduledPublishAt, "PPP 'à' HH:mm", { locale: fr })
                          ) : (
                            <span>Choisir une date de publication</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledPublishAt}
                          onSelect={setScheduledPublishAt}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {scheduledPublishAt && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          L'article sera publié automatiquement le{' '}
                          {format(scheduledPublishAt, "PPP 'à' HH:mm", { locale: fr })}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setScheduledPublishAt(undefined)}
                          disabled={isLoading}
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
