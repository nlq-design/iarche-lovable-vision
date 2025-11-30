import { useEffect, useState, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Eye, History, Calendar as CalendarIcon, Upload, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { LazyQuill } from '@/components/admin/LazyQuill';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FAQPreviewModal } from '@/components/admin/FAQPreviewModal';

interface FAQItem {
  question: string;
  answer: string;
}

const AdminArticleEditor = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(!!id);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [generatingFAQ, setGeneratingFAQ] = useState(false);
  const [faqPreviewOpen, setFaqPreviewOpen] = useState(false);
  const [generatedFAQ, setGeneratedFAQ] = useState<FAQItem[] | null>(null);
  const [autoGenerateFAQ, setAutoGenerateFAQ] = useState(false);
  const [existingFAQ, setExistingFAQ] = useState<FAQItem[] | null>(null);
  const [faqMode, setFaqMode] = useState<'new' | 'add'>('new');
  
  // Déterminer le resource_type depuis la route
  const getResourceTypeFromPath = () => {
    const path = location.pathname;
    if (path.includes('/admin/actualites/new')) return 'actualite';
    if (path.includes('/admin/cas-clients/new')) return 'cas-client';
    if (path.includes('/admin/livres-blancs/new')) return 'livre-blanc';
    if (path.includes('/admin/ateliers-webinaires/new')) return 'atelier-webinaire';
    if (path.includes('/admin/articles/new')) return 'article';
    return 'actualite'; // Défaut
  };

  // Générer l'URL publique en fonction du resource_type
  const getPublicUrl = (resourceType: string, articleSlug: string) => {
    const urlMap: Record<string, string> = {
      'article': `/articles/${articleSlug}`,
      'actualite': `/actualites/${articleSlug}`,
      'cas-client': `/cas-clients/${articleSlug}`,
      'livre-blanc': `/livres-blancs/${articleSlug}`,
      'atelier-webinaire': `/ateliers-webinaires/${articleSlug}`,
    };
    return urlMap[resourceType] || `/actualites/${articleSlug}`;
  };
  
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
  
  // Champs spécifiques aux types de contenu
  const [resourceType, setResourceType] = useState<string>(() => !id ? getResourceTypeFromPath() : 'actualite');
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventLocation, setEventLocation] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [replayUrl, setReplayUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [ressourcesComplementaires, setRessourcesComplementaires] = useState<Array<{ titre: string; url: string }>>([]);
  
  // Champs spécifiques aux actualités
  const [actualiteType, setActualiteType] = useState<string>('');
  const [sourceExterne, setSourceExterne] = useState<{ nom: string; url: string }>({ nom: '', url: '' });

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

  // Auto-save toutes les 30 secondes
  useEffect(() => {
    if (!id || !hasChanges) return;

    const autoSaveInterval = setInterval(async () => {
      await handleAutoSave();
    }, 30000); // 30 secondes

    return () => clearInterval(autoSaveInterval);
  }, [id, hasChanges, title, slug, excerpt, content, coverImageUrl, published, scheduledPublishAt, selectedCategories, selectedTags, resourceType, eventDate, eventLocation, registrationOpen, maxParticipants, replayUrl, fileUrl, ressourcesComplementaires]);

  // Marquer comme modifié lors des changements
  useEffect(() => {
    if (id && !loadingArticle) {
      setHasChanges(true);
    }
  }, [title, excerpt, content, coverImageUrl, published, scheduledPublishAt, selectedCategories, selectedTags, resourceType, eventDate, eventLocation, registrationOpen, maxParticipants, replayUrl, fileUrl, ressourcesComplementaires]);

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
      setResourceType(data.resource_type || 'actualite');
      setEventDate(data.event_date ? new Date(data.event_date) : undefined);
      setEventLocation(data.event_location || '');
      setRegistrationOpen(data.registration_open ?? true);
      setMaxParticipants(data.max_participants || 30);
      setReplayUrl(data.replay_url || '');
      setFileUrl(data.file_url || '');
      setRessourcesComplementaires(
        Array.isArray(data.ressources_complementaires) 
          ? data.ressources_complementaires as Array<{ titre: string; url: string }> 
          : []
      );
      setActualiteType(data.actualite_type || '');
      setSourceExterne(
        data.source_externe && typeof data.source_externe === 'object' && 'nom' in data.source_externe && 'url' in data.source_externe
          ? data.source_externe as { nom: string; url: string }
          : { nom: '', url: '' }
      );

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

      // Charger la FAQ existante
      const { data: faqData } = await supabase
        .from('faqs')
        .select('questions')
        .eq('article_id', id)
        .maybeSingle();
      
      if (faqData && faqData.questions) {
        setExistingFAQ(faqData.questions as unknown as FAQItem[]);
      }
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

  const handleAutoSave = async () => {
    if (!id || !user || autoSaving || !hasChanges) return;

    // Valider le slug avant de sauvegarder
    const isSlugValid = await validateSlug(slug);
    if (!isSlugValid) return;

    setAutoSaving(true);

    const articleData = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      cover_image_url: coverImageUrl || null,
      published,
      scheduled_publish_at: scheduledPublishAt ? scheduledPublishAt.toISOString() : null,
      resource_type: resourceType,
      event_date: eventDate ? eventDate.toISOString() : null,
      event_location: eventLocation || null,
      registration_open: registrationOpen,
      max_participants: maxParticipants,
      replay_url: replayUrl || null,
      file_url: fileUrl || null,
      ressources_complementaires: ressourcesComplementaires.length > 0 ? ressourcesComplementaires : null,
      actualite_type: actualiteType || null,
      source_externe: (sourceExterne.nom && sourceExterne.url) ? sourceExterne : null,
    };

    try {
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', id);

      if (!error) {
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

        setLastSaved(new Date());
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSuggestTags = async () => {
    if (!title || !content) {
      toast({ 
        title: "Contenu insuffisant", 
        description: "Ajoutez un titre et du contenu pour suggérer des tags",
        variant: "destructive" 
      });
      return;
    }

    setSuggestingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { title, content, excerpt }
      });

      if (error) throw error;

      if (data && data.tags) {
        setSuggestedTags(data.tags);
        toast({ 
          title: "Tags suggérés", 
          description: `${data.tags.length} tags générés automatiquement` 
        });
      }
    } catch (error) {
      console.error('Error suggesting tags:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de suggérer des tags",
        variant: "destructive" 
      });
    } finally {
      setSuggestingTags(false);
    }
  };

  const handleAddSuggestedTag = async (tagName: string) => {
    // Vérifier si le tag existe déjà dans la DB
    let { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .maybeSingle();

    if (!existingTag) {
      // Créer le tag
      const tagSlug = tagName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-');
      
      const { data: newTag } = await supabase
        .from('tags')
        .insert({ name: tagName, slug: tagSlug })
        .select('id')
        .single();
      
      if (newTag) {
        existingTag = newTag;
        // Ajouter à la liste des tags disponibles
        setAvailableTags([...availableTags, { id: newTag.id, name: tagName }]);
      }
    }

    if (existingTag && !selectedTags.includes(existingTag.id)) {
      setSelectedTags([...selectedTags, existingTag.id]);
      setSuggestedTags(suggestedTags.filter(t => t !== tagName));
    }
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
    window.open(getPublicUrl(resourceType, slug), '_blank');
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
      resource_type: resourceType,
      author_id: user.id,
      event_date: eventDate ? eventDate.toISOString() : null,
      event_location: eventLocation || null,
      registration_open: registrationOpen,
      max_participants: maxParticipants,
      replay_url: replayUrl || null,
      file_url: fileUrl || null,
      ressources_complementaires: ressourcesComplementaires.length > 0 ? ressourcesComplementaires : null,
      actualite_type: actualiteType || null,
      source_externe: (sourceExterne.nom && sourceExterne.url) ? sourceExterne : null,
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

        setLastSaved(new Date());
        setHasChanges(false);
        
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
        
        // Générer FAQ automatiquement si demandé et si type éligible
        if (autoGenerateFAQ && ['article', 'actualite', 'cas-client'].includes(resourceType)) {
          toast({
            title: 'Génération FAQ en cours',
            description: 'La FAQ est en cours de génération...',
          });
          
          // Délai pour permettre la mise à jour de l'article avant génération
          setTimeout(() => {
            handleGenerateFAQ(newArticle.id);
          }, 1000);
        } else {
          // Rediriger vers la page admin correspondant au resource_type
          const adminRedirectMap: Record<string, string> = {
            'article': '/admin/articles',
            'actualite': '/admin/actualites',
            'cas-client': '/admin/cas-clients',
            'livre-blanc': '/admin/livres-blancs',
            'atelier-webinaire': '/admin/ateliers-webinaires',
          };
          navigate(adminRedirectMap[resourceType] || '/admin');
        }
      }
    }

    setIsLoading(false);
  };

  const handleGenerateFAQ = async (articleId?: string, mode: 'new' | 'add' = 'new') => {
    const targetId = articleId || id;
    
    if (!targetId || !title || !content) {
      toast({
        title: "Contenu insuffisant",
        description: "Sauvegardez l'article avant de générer la FAQ",
        variant: "destructive"
      });
      return;
    }

    setFaqMode(mode);
    setGeneratingFAQ(true);
    setFaqPreviewOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-faq', {
        body: {
          article_id: targetId,
          title,
          content,
          resource_type: resourceType,
          mode: mode,
          existing_questions: mode === 'add' && existingFAQ ? existingFAQ.map(f => f.question) : []
        }
      });

      if (error) throw error;

      if (data && data.questions) {
        setGeneratedFAQ(data.questions);
        const count = data.questions.length;
        toast({
          title: mode === 'add' ? "Questions ajoutées" : "FAQ générée",
          description: mode === 'add' 
            ? `${count} nouvelle(s) question(s) suggérée(s)` 
            : `${count} questions créées automatiquement`
        });
      }
    } catch (error) {
      console.error('Error generating FAQ:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer la FAQ",
        variant: "destructive"
      });
      setFaqPreviewOpen(false);
    } finally {
      setGeneratingFAQ(false);
    }
  };

  const handleSaveFAQ = () => {
    if (generatedFAQ && generatedFAQ.length > 0) {
      toast({
        title: "FAQ enregistrée",
        description: "La FAQ a été enregistrée avec succès"
      });
      setFaqPreviewOpen(false);
      setGeneratedFAQ(null);
    }
  };

  const handleRegenerateFAQ = async () => {
    setGeneratedFAQ(null);
    await handleGenerateFAQ();
  };

  const handleCloseFAQModal = () => {
    setFaqPreviewOpen(false);
    setGeneratedFAQ(null);
  };

  if (authLoading || loadingArticle) {
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
        <title>{id ? 'Modifier l\'article' : 'Nouvel article'} - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NavLink to="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
              </NavLink>
              {id && autoSaving && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Sauvegarde automatique...
                </span>
              )}
              {id && lastSaved && !autoSaving && !hasChanges && (
                <span className="text-sm text-muted-foreground">
                  Sauvegardé à {format(lastSaved, 'HH:mm:ss')}
                </span>
              )}
              {id && hasChanges && !autoSaving && (
                <span className="text-sm text-accent">
                  Modifications non sauvegardées
                </span>
              )}
            </div>
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
                      URL: {getPublicUrl(resourceType, slug || 'mon-article')}
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
                  <Label htmlFor="resourceType">Type de contenu *</Label>
                  <Select value={resourceType} onValueChange={setResourceType} disabled={isLoading || !!id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actualite">Actualité</SelectItem>
                      <SelectItem value="article">Article (fond)</SelectItem>
                      <SelectItem value="cas-client">Cas client</SelectItem>
                      <SelectItem value="livre-blanc">Livre blanc</SelectItem>
                      <SelectItem value="atelier-webinaire">Atelier/Webinaire</SelectItem>
                    </SelectContent>
                  </Select>
                  {!id && (
                    <p className="text-xs text-muted-foreground">
                      Le type est déterminé par la page de création utilisée
                    </p>
                  )}
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

                {resourceType === 'livre-blanc' && (
                  <div className="space-y-2">
                    <Label htmlFor="fileUpload">Fichier PDF</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="fileUpload"
                        type="file"
                        accept=".pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 20 * 1024 * 1024) {
                            toast({
                              title: 'Fichier trop volumineux',
                              description: 'La taille maximale est de 20 MB',
                              variant: 'destructive'
                            });
                            return;
                          }

                          setUploadingFile(true);
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Math.random()}.${fileExt}`;
                          const filePath = `${fileName}`;

                          const { error: uploadError, data } = await supabase.storage
                            .from('livres-blancs')
                            .upload(filePath, file);

                          if (uploadError) {
                            toast({
                              title: 'Erreur d\'upload',
                              description: uploadError.message,
                              variant: 'destructive'
                            });
                          } else {
                            const { data: { publicUrl } } = supabase.storage
                              .from('livres-blancs')
                              .getPublicUrl(filePath);
                            setFileUrl(publicUrl);
                            toast({
                              title: 'Fichier uploadé',
                              description: 'Le fichier a été uploadé avec succès'
                            });
                          }
                          setUploadingFile(false);
                        }}
                        disabled={isLoading || uploadingFile}
                      />
                      {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {fileUrl && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                          Voir le fichier
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {resourceType === 'atelier-webinaire' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-foreground">Informations événement</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Date de l'événement</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !eventDate && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventDate ? format(eventDate, "PPP 'à' HH:mm", { locale: fr }) : "Choisir une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={eventDate}
                            onSelect={setEventDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventLocation">Lieu de l'événement</Label>
                      <Input
                        id="eventLocation"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        disabled={isLoading}
                        placeholder="Ex: Visio, Bayonne, Paris..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxParticipants">Nombre maximum de participants</Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                        disabled={isLoading}
                        min="1"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="registrationOpen"
                        checked={registrationOpen}
                        onCheckedChange={setRegistrationOpen}
                        disabled={isLoading}
                      />
                      <Label htmlFor="registrationOpen" className="cursor-pointer">
                        Inscriptions ouvertes
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="replayUrl">URL du replay (optionnel)</Label>
                      <Input
                        id="replayUrl"
                        type="url"
                        value={replayUrl}
                        onChange={(e) => setReplayUrl(e.target.value)}
                        disabled={isLoading}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}

                {/* Champs spécifiques aux actualités */}
                {resourceType === 'actualite' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-foreground">Informations actualité</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="actualiteType">Type d'actualité</Label>
                      <Select value={actualiteType} onValueChange={setActualiteType} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annonce">Annonce</SelectItem>
                          <SelectItem value="partenariat">Partenariat</SelectItem>
                          <SelectItem value="evenement">Événement</SelectItem>
                          <SelectItem value="communique">Communiqué</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {actualiteType === 'evenement' && (
                      <div className="space-y-2">
                        <Label htmlFor="eventDate">Date de l'événement</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !eventDate && "text-muted-foreground"
                              )}
                              disabled={isLoading}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {eventDate ? format(eventDate, "PPP 'à' HH:mm", { locale: fr }) : "Choisir une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={eventDate}
                              onSelect={setEventDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="sourceExterneNom">Source externe (optionnel)</Label>
                      <Input
                        id="sourceExterneNom"
                        value={sourceExterne.nom}
                        onChange={(e) => setSourceExterne({ ...sourceExterne, nom: e.target.value })}
                        disabled={isLoading}
                        placeholder="Nom de la source (ex: Le Monde, TechCrunch...)"
                      />
                    </div>

                    {sourceExterne.nom && (
                      <div className="space-y-2">
                        <Label htmlFor="sourceExterneUrl">URL de la source</Label>
                        <Input
                          id="sourceExterneUrl"
                          type="url"
                          value={sourceExterne.url}
                          onChange={(e) => setSourceExterne({ ...sourceExterne, url: e.target.value })}
                          disabled={isLoading}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>
                )}

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
                  <div className="flex items-center justify-between">
                    <Label>Tags</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestTags}
                      disabled={suggestingTags || !title || !content}
                    >
                      {suggestingTags ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✨</span>
                          Suggérer des tags
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {suggestedTags.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Tags suggérés (cliquez pour ajouter) :</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAddSuggestedTag(tag)}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
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

                {/* Ressources complémentaires - uniquement pour les articles */}
                {resourceType === 'article' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Ressources complémentaires</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRessourcesComplementaires([...ressourcesComplementaires, { titre: '', url: '' }])}
                        disabled={isLoading}
                      >
                        + Ajouter une ressource
                      </Button>
                    </div>
                    
                    {ressourcesComplementaires.length > 0 ? (
                      <div className="space-y-3">
                        {ressourcesComplementaires.map((ressource, index) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`ressource-titre-${index}`}>Titre</Label>
                                <Input
                                  id={`ressource-titre-${index}`}
                                  value={ressource.titre}
                                  onChange={(e) => {
                                    const newRessources = [...ressourcesComplementaires];
                                    newRessources[index].titre = e.target.value;
                                    setRessourcesComplementaires(newRessources);
                                  }}
                                  placeholder="Titre de la ressource"
                                  disabled={isLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ressource-url-${index}`}>URL</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id={`ressource-url-${index}`}
                                    type="url"
                                    value={ressource.url}
                                    onChange={(e) => {
                                      const newRessources = [...ressourcesComplementaires];
                                      newRessources[index].url = e.target.value;
                                      setRessourcesComplementaires(newRessources);
                                    }}
                                    placeholder="https://..."
                                    disabled={isLoading}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const newRessources = ressourcesComplementaires.filter((_, i) => i !== index);
                                      setRessourcesComplementaires(newRessources);
                                    }}
                                    disabled={isLoading}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune ressource complémentaire ajoutée. Cliquez sur "+ Ajouter une ressource" pour en ajouter.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="content">Contenu *</Label>
                  <LazyQuill
                    value={content}
                    onChange={setContent}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'image'],
                        ['clean'],
                      ],
                    }}
                    placeholder="Rédigez votre article ici..."
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

                {!id && ['article', 'actualite', 'cas-client'].includes(resourceType) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoGenerateFAQ"
                      checked={autoGenerateFAQ}
                      onCheckedChange={(checked) => setAutoGenerateFAQ(checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="autoGenerateFAQ" className="cursor-pointer text-sm">
                      Générer FAQ automatiquement après création
                    </Label>
                  </div>
                )}

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
                  {id && ['article', 'actualite', 'cas-client'].includes(resourceType) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLoading || generatingFAQ}
                        >
                          {generatingFAQ ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          Générer FAQ
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleGenerateFAQ(undefined, 'new')}>
                          Générer nouvelle FAQ
                        </DropdownMenuItem>
                        {existingFAQ && existingFAQ.length > 0 && (
                          <DropdownMenuItem onClick={() => handleGenerateFAQ(undefined, 'add')}>
                            Ajouter questions
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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

      <FAQPreviewModal
        isOpen={faqPreviewOpen}
        faqData={generatedFAQ}
        isGenerating={generatingFAQ}
        onClose={handleCloseFAQModal}
        onSave={handleSaveFAQ}
        onRegenerate={handleRegenerateFAQ}
      />
    </AdminLayout>
  );
};

export default AdminArticleEditor;
