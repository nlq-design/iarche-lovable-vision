import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit, Sparkles, HelpCircle, TrendingUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface FAQItem {
  question: string;
  answer: string;
  frequency?: number;
}

interface FAQ {
  id: string;
  article_id: string;
  questions: FAQItem[];
  auto_suggested: boolean;
  suggestion_source: string | null;
  created_at: string;
  updated_at: string;
  article?: {
    title: string;
    slug: string;
    resource_type: string;
  };
}

const AdminFAQs = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<FAQItem[]>([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadFAQs();
    }
  }, [user, isAdmin]);

  const loadFAQs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faqs')
      .select(`
        *,
        article:articles(title, slug, resource_type)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFaqs(data as unknown as FAQ[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return;

    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la FAQ',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'FAQ supprimée',
        description: 'La FAQ a été supprimée avec succès',
      });
      loadFAQs();
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setEditedQuestions(faq.questions as FAQItem[]);
  };

  const handleSaveEdit = async () => {
    if (!editingFAQ) return;

    const { error } = await supabase
      .from('faqs')
      .update({
        questions: editedQuestions as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingFAQ.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la FAQ',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'FAQ mise à jour',
        description: 'La FAQ a été mise à jour avec succès',
      });
      setEditingFAQ(null);
      loadFAQs();
    }
  };

  const handleAnalyzeComments = async (articleId: string) => {
    setAnalyzing(articleId);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-comments-for-faq', {
        body: { article_id: articleId, lookback_days: 30 }
      });

      if (error) throw error;

      if (data && data.success && data.suggested_questions.length > 0) {
        // Upsert les nouvelles questions suggérées
        const { error: upsertError } = await supabase
          .from('faqs')
          .upsert({
            article_id: articleId,
            questions: data.suggested_questions as any,
            auto_suggested: true,
            suggestion_source: 'comments',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'article_id'
          });

        if (upsertError) throw upsertError;

        toast({
          title: 'Analyse terminée',
          description: `${data.suggested_questions.length} questions suggérées depuis ${data.total_comments_analyzed} commentaires`,
        });
        loadFAQs();
      } else {
        toast({
          title: 'Analyse terminée',
          description: data?.message || 'Pas assez de commentaires pour générer des suggestions',
        });
      }
    } catch (error) {
      console.error('Error analyzing comments:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'analyser les commentaires',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(null);
    }
  };

  const updateQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...editedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditedQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    setEditedQuestions(editedQuestions.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setEditedQuestions([...editedQuestions, { question: '', answer: '' }]);
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
        <title>Gestion des FAQs · Admin · IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion des FAQs</h1>
            <p className="text-muted-foreground mt-1">
              Gérer et améliorer les FAQs générées automatiquement
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            {faqs.length} FAQ{faqs.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {faqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune FAQ générée. Créez des articles et générez des FAQs depuis l'éditeur.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.id} className="bg-background/95 border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-foreground mb-2">
                        {faq.article?.title || 'Article supprimé'}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{faq.article?.resource_type}</Badge>
                        {faq.auto_suggested && (
                          <Badge variant="outline" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Auto-suggéré
                          </Badge>
                        )}
                        {faq.suggestion_source && (
                          <span className="text-xs">
                            depuis {faq.suggestion_source === 'comments' ? 'commentaires' : faq.suggestion_source}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {faq.article_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAnalyzeComments(faq.article_id)}
                          disabled={analyzing === faq.article_id}
                        >
                          {analyzing === faq.article_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(faq)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(faq.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {(faq.questions as FAQItem[]).map((item, index) => (
                      <AccordionItem 
                        key={index} 
                        value={`item-${index}`}
                        className="border-b border-border/50"
                      >
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span>{item.question}</span>
                            {item.frequency && item.frequency >= 4 && (
                              <Badge variant="destructive" className="text-xs">
                                Fréquent
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingFAQ} onOpenChange={() => setEditingFAQ(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editedQuestions.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Question {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.question}
                    onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                    placeholder="Question..."
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                    placeholder="Réponse..."
                    rows={3}
                  />
                </div>
              </Card>
            ))}
            <Button onClick={addQuestion} variant="outline" className="w-full">
              + Ajouter une question
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFAQ(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFAQs;
