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
    <div className="space-y-4">
      <Card className="bg-background/50 border-border/30">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-foreground text-base">
            <MessageCircle className="h-4 w-4" />
            Commentaires ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              Aucun commentaire pour le moment. Soyez le premier à commenter !
            </p>
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-2.5 rounded border border-border/30 bg-background/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground text-xs">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-background/50 border-border/30">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-foreground text-sm">
            Laisser un commentaire
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <Label htmlFor="name" className="text-xs">Nom *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  required
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="content" className="text-xs">Commentaire *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Votre commentaire..."
                rows={3}
                required
                className="mt-0.5 resize-none text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground/80">
              Votre commentaire sera visible après modération.
            </p>
            <Button type="submit" disabled={submitting} size="sm" className="h-8 text-xs">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
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
