import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle } from 'lucide-react';
import { commentSchema } from '@/schemas/contact';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface ArticleCommentsProps {
  articleId: string;
}

export const ArticleComments = ({ articleId }: ArticleCommentsProps) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('id, author_name, content, created_at')
      .eq('article_id', articleId)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation avec Zod
    const validation = commentSchema.safeParse({
      author_name: name,
      author_email: email,
      content: content
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: 'Erreur de validation',
        description: firstError.message,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        article_id: articleId,
        author_name: name,
        author_email: email,
        content: content,
        approved: false,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le commentaire',
        variant: 'destructive',
      });
    } else {
      // Envoyer la notification aux admins
      await supabase.functions.invoke('notify-new-comment', {
        body: {
          comment_id: newComment.id,
          article_id: articleId,
          author_name: name,
          author_email: email,
          content: content,
        },
      });

      toast({
        title: 'Commentaire envoyé',
        description: 'Votre commentaire sera visible après modération',
      });
      setName('');
      setEmail('');
      setContent('');
    }

    setSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      <Card className="bg-background/95 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5" />
            Commentaires ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun commentaire pour le moment. Soyez le premier à commenter !
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-lg border border-border bg-background/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-background/95 border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Laisser un commentaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="content">Commentaire *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Votre commentaire..."
                rows={4}
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Votre commentaire sera visible après modération.
            </p>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
