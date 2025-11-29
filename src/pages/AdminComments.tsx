import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Comment {
  id: string;
  article_id: string;
  author_name: string;
  author_email: string;
  content: string;
  approved: boolean;
  created_at: string;
  articles?: {
    title: string;
  };
}

const AdminComments = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadComments();
    }
  }, [user, isAdmin, currentPage]);

  const loadComments = async () => {
    setLoading(true);
    
    // Récupérer le nombre total
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    setTotalCount(count || 0);

    // Récupérer les commentaires paginés
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('comments')
      .select('*, articles(title)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les commentaires',
        variant: 'destructive',
      });
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ approved: true })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'approuver le commentaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Commentaire approuvé',
      });
      loadComments();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ approved: false })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter le commentaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Commentaire rejeté',
      });
      loadComments();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le commentaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Commentaire supprimé',
      });
      loadComments();
    }
    setDeleteId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingComments = comments.filter((c) => !c.approved);
  const approvedComments = comments.filter((c) => c.approved);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (authLoading || loading) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackgroundLayout>
    );
  }

  const CommentCard = ({ comment }: { comment: Comment }) => (
    <Card key={comment.id} className="bg-background/95 border-border">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground">
                  {comment.author_name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {comment.author_email}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Article: {comment.articles?.title || 'Non trouvé'}
              </p>
              <p className="text-foreground mb-2">{comment.content}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            {!comment.approved ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(comment.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approuver
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(comment.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(comment.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Modération des commentaires - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <NavLink to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
              </Button>
            </NavLink>
          </div>

          <Card className="bg-background/95 border-border mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                Modération des commentaires
              </CardTitle>
            </CardHeader>
          </Card>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                En attente ({pendingComments.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approuvés ({approvedComments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-6">
              {pendingComments.length === 0 ? (
                <Card className="bg-background/95 border-border">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Aucun commentaire en attente
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingComments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 mt-6">
              {approvedComments.length === 0 ? (
                <Card className="bg-background/95 border-border">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Aucun commentaire approuvé
                    </p>
                  </CardContent>
                </Card>
              ) : (
                approvedComments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BackgroundLayout>
  );
};

export default AdminComments;
