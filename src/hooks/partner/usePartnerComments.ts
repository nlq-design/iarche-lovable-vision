import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';
import { toast } from 'sonner';

export interface PartnerComment {
  id: string;
  partner_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  partner?: {
    name: string;
    avatar_url: string | null;
  };
}

interface CreateCommentInput {
  entity_type: 'project' | 'lead';
  entity_id: string;
  content: string;
}

interface UpdateCommentInput {
  id: string;
  content: string;
}

export function usePartnerComments(entityType: 'project' | 'lead', entityId: string) {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-comments', entityType, entityId],
    queryFn: async (): Promise<PartnerComment[]> => {
      const { data, error } = await supabase
        .from('partner_comments')
        .select(`
          id,
          partner_id,
          entity_type,
          entity_id,
          content,
          created_at,
          updated_at,
          partners:partner_id (
            name,
            avatar_url
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        partner_id: c.partner_id,
        entity_type: c.entity_type,
        entity_id: c.entity_id,
        content: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        partner: c.partners ? {
          name: c.partners.name,
          avatar_url: c.partners.avatar_url,
        } : undefined,
      }));
    },
    enabled: !!entityId,
  });
}

export function useCreatePartnerComment() {
  const { partnerId } = usePartnerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!partnerId) throw new Error('Partner ID not found');

      const { data, error } = await supabase
        .from('partner_comments')
        .insert({
          partner_id: partnerId,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          content: input.content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['partner-comments', variables.entity_type, variables.entity_id] 
      });
      toast.success('Commentaire ajouté');
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    },
  });
}

export function useUpdatePartnerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCommentInput) => {
      const { error } = await supabase
        .from('partner_comments')
        .update({ content: input.content })
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-comments'] });
      toast.success('Commentaire modifié');
    },
    onError: (error) => {
      console.error('Error updating comment:', error);
      toast.error('Erreur lors de la modification');
    },
  });
}

export function useDeletePartnerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('partner_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-comments'] });
      toast.success('Commentaire supprimé');
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}
