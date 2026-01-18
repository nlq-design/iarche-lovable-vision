import { useState } from 'react';
import { MessageSquare, Send, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePartnerComments,
  useCreatePartnerComment,
  useUpdatePartnerComment,
  useDeletePartnerComment,
  PartnerComment,
} from '@/hooks/partner/usePartnerComments';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnerCommentsSectionProps {
  entityType: 'project' | 'lead';
  entityId: string;
  entityName?: string;
}

export function PartnerCommentsSection({ entityType, entityId, entityName }: PartnerCommentsSectionProps) {
  const { partnerId, partnerData } = usePartnerAuth();
  const { data: comments, isLoading } = usePartnerComments(entityType, entityId);
  const createComment = useCreatePartnerComment();
  const updateComment = useUpdatePartnerComment();
  const deleteComment = useDeletePartnerComment();

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      content: newComment.trim(),
    });
    setNewComment('');
  };

  const handleEdit = (comment: PartnerComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    await updateComment.mutateAsync({
      id: editingId,
      content: editContent.trim(),
    });
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: string) => {
    if (confirm('Supprimer ce commentaire ?')) {
      await deleteComment.mutateAsync(commentId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Commentaires
          {comments && comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwn = comment.partner_id === partnerId;
              const isEditing = editingId === comment.id;

              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.partner?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.partner?.name ? getInitials(comment.partner.name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.partner?.name || 'Partenaire'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd MMM à HH:mm', { locale: fr })}
                        </span>
                        {comment.updated_at !== comment.created_at && (
                          <span className="text-xs text-muted-foreground">(modifié)</span>
                        )}
                      </div>
                      {isOwn && !isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEdit(comment)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateComment.isPending}
                          >
                            Enregistrer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        )}

        {/* New comment form */}
        <form onSubmit={handleSubmit} className="flex gap-3 pt-2 border-t">
          <Avatar className="h-8 w-8">
            <AvatarImage src={partnerData?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {partnerData?.name ? getInitials(partnerData.name) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={1}
              className="min-h-[38px] text-sm resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || createComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
