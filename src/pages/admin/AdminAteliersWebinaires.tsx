import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Edit, Trash2, Eye, History, HelpCircle, FileText,
  ClipboardCopy, ExternalLink, Lock, MapPin, Calendar, Users, Video, Presentation
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NavLink } from '@/components/NavLink';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useCockpitGeneratedDocuments } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { toast as sonnerToast } from 'sonner';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  event_date: string | null;
  event_location: string | null;
  max_participants: number | null;
  type_evenement: string | null;
  has_faq?: boolean;
  linked_form?: LinkedForm | null;
  linked_document?: LinkedDocument | null;
  inscriptions_count?: number;
}

type TimeFilter = 'all' | 'upcoming' | 'past';

const AdminAteliersWebinaires = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
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
        id, title, slug, excerpt, published, published_at, created_at, resource_type,
        event_date, event_location, max_participants, type_evenement,
        faqs!left(id)
      `)
      .eq('resource_type', 'atelier-webinaire')
      .order('event_date', { ascending: false, nullsFirst: false });

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les ateliers et webinaires', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const articleIds = (data || []).map((a: any) => a.id);

    // Load linked forms, documents, and inscription counts in parallel
    const [formsRes, docsRes, inscriptionsRes] = await Promise.all([
      supabase.from('forms').select('id, slug, title, is_active, submissions_count, article_id').in('article_id', articleIds),
      supabase.from('generated_documents').select('id, title, version, status, article_id').in('article_id', articleIds).order('created_at', { ascending: false }),
      supabase.from('atelier_inscriptions').select('atelier_id').in('atelier_id', articleIds),
    ]);

    const formsByArticle = new Map<string, LinkedForm>();
    (formsRes.data || []).forEach((f: any) => {
      if (f.article_id) formsByArticle.set(f.article_id, { id: f.id, slug: f.slug, title: f.title, is_active: f.is_active, submissions_count: f.submissions_count || 0 });
    });

    const docsByArticle = new Map<string, LinkedDocument>();
    (docsRes.data || []).forEach((d: any) => {
      if (d.article_id && !docsByArticle.has(d.article_id)) docsByArticle.set(d.article_id, { id: d.id, title: d.title, version: d.version || 1, status: d.status });
    });

    const inscriptionCounts = new Map<string, number>();
    (inscriptionsRes.data || []).forEach((i: any) => {
      inscriptionCounts.set(i.atelier_id, (inscriptionCounts.get(i.atelier_id) || 0) + 1);
    });

    const articlesWithData = (data || []).map((article: any) => ({
      ...article,
      has_faq: article.faqs && article.faqs.length > 0,
      faqs: undefined,
      linked_form: formsByArticle.get(article.id) || null,
      linked_document: docsByArticle.get(article.id) || null,
      inscriptions_count: inscriptionCounts.get(article.id) || 0,
    }));
    setArticles(articlesWithData);
    setLoading(false);
  };

  const filteredArticles = useMemo(() => {
    if (timeFilter === 'all') return articles;
    const now = new Date();
    return articles.filter((a) => {
      if (!a.event_date) return timeFilter === 'past';
      const eventDate = parseISO(a.event_date);
      return timeFilter === 'upcoming' ? !isPast(eventDate) : isPast(eventDate);
    });
  }, [articles, timeFilter]);

  const stats = useMemo(() => ({
    total: articles.length,
    upcoming: articles.filter(a => a.event_date && !isPast(parseISO(a.event_date))).length,
    past: articles.filter(a => !a.event_date || isPast(parseISO(a.event_date))).length,
  }), [articles]);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet atelier ou webinaire ?')) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'atelier ou webinaire", variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Atelier/webinaire supprimé' });
      loadArticles();
    }
  };

  const copyFormUrl = (slug: string) => {
    const url = `https://iarche.fr/formulaires/${slug}`;
    navigator.clipboard.writeText(url);
    sonnerToast.success('URL copiée !', { description: url });
  };

  const getTypeBadge = (type: string | null) => {
    const isWebinaire = type === 'webinaire' || type === 'en_ligne';
    return (
      <Badge variant="outline" className={isWebinaire ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-amber-300 text-amber-700 bg-amber-50'}>
        {isWebinaire ? <Video className="h-3 w-3 mr-1" /> : <Presentation className="h-3 w-3 mr-1" />}
        {isWebinaire ? 'Webinaire' : 'Atelier'}
      </Badge>
    );
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestion des ateliers & webinaires</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total} événement{stats.total > 1 ? 's' : ''} — {stats.upcoming} à venir, {stats.past} passé{stats.past > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="past">Passés</SelectItem>
                </SelectContent>
              </Select>
              <NavLink to="/admin/ateliers-webinaires/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel événement
                </Button>
              </NavLink>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {filteredArticles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {timeFilter === 'all' ? 'Aucun atelier ou webinaire' : timeFilter === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
                </p>
              </Card>
            ) : (
              filteredArticles.map((article) => {
                const isEventPast = article.event_date ? isPast(parseISO(article.event_date)) : true;
                return (
                  <Card key={article.id} className={`p-6 ${isEventPast ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-foreground truncate">{article.title}</h3>
                          {getTypeBadge(article.type_evenement)}
                          <Badge variant={article.published ? 'default' : 'secondary'}>
                            {article.published ? 'Publié' : 'Brouillon'}
                          </Badge>
                          {isEventPast && article.event_date && (
                            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Passé</Badge>
                          )}
                        </div>

                        {article.excerpt && (
                          <p className="text-muted-foreground line-clamp-1 text-sm mb-3">{article.excerpt}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {/* Event date */}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {article.event_date
                              ? format(parseISO(article.event_date), 'dd MMM yyyy', { locale: fr })
                              : 'Date non définie'}
                          </span>

                          {/* Location */}
                          {article.event_location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {article.event_location}
                            </span>
                          )}

                          {/* Inscriptions counter */}
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {article.inscriptions_count}{article.max_participants ? `/${article.max_participants}` : ''} inscrit{(article.inscriptions_count || 0) > 1 ? 's' : ''}
                          </span>

                          {article.has_faq && (
                            <span title="FAQ générée"><HelpCircle className="h-4 w-4 text-accent" /></span>
                          )}

                          {/* Linked form */}
                          {article.linked_form ? (
                            <button
                              onClick={() => navigate(`/admin/formulaires/${article.linked_form!.id}`)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                            >
                              Formulaire ({article.linked_form.submissions_count} rép.)
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Aucun formulaire</span>
                          )}

                          {/* Linked document */}
                          {article.linked_document && (
                            <button
                              onClick={() => navigate(`/admin/invitation/${article.linked_document!.id}`)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium hover:bg-green-200 transition-colors"
                            >
                              {article.linked_document.status === 'approved' ? <Lock className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                              Programme v{article.linked_document.version}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {/* Inscriptions link */}
                        {article.linked_form && (
                          <>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/admin/formulaires/${article.linked_form!.id}/responses`)} title="Voir les inscriptions">
                              <Users className="h-3.5 w-3.5" />
                              Inscrits
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => copyFormUrl(article.linked_form!.slug)} title="Copier l'URL">
                              <ClipboardCopy className="h-4 w-4" />
                            </Button>
                            <NavLink to={`/formulaires/${article.linked_form!.slug}`}>
                              <Button variant="outline" size="icon" title="Voir le formulaire public">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </NavLink>
                          </>
                        )}
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
                                loadArticles();
                                sonnerToast.success('Programme généré !', {
                                  duration: 10000,
                                  action: { label: 'Voir', onClick: () => navigate(`/admin/invitation/${doc.id}`) },
                                });
                              },
                              onError: () => setGeneratingId(null),
                            });
                          }}
                        >
                          {generatingId === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          {generatingId === article.id ? 'Génération...' : 'Programme'}
                        </Button>
                        <NavLink to={`/ateliers-webinaires/${article.slug}`}>
                          <Button variant="outline" size="icon" title="Aperçu public"><Eye className="h-4 w-4" /></Button>
                        </NavLink>
                        <NavLink to={`/admin/ateliers-webinaires/${article.id}`}>
                          <Button variant="outline" size="icon" title="Éditer"><Edit className="h-4 w-4" /></Button>
                        </NavLink>
                        <NavLink to={`/admin/ateliers-webinaires/${article.id}/history`}>
                          <Button variant="outline" size="icon" title="Historique"><History className="h-4 w-4" /></Button>
                        </NavLink>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(article.id)} title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAteliersWebinaires;
