import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ContextNoteEntityType = 'lead' | 'project' | 'solution' | 'partner' | 'document' | 'transcription';

export interface EntityContextNote {
  id: string;
  entity_type: ContextNoteEntityType;
  entity_id: string;
  content: string;
  created_by: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateNoteInput {
  entity_type: ContextNoteEntityType;
  entity_id: string;
  content: string;
}

interface UpdateNoteInput {
  id: string;
  content: string;
}

export function useEntityContextNotes(entityType: ContextNoteEntityType, entityId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['entity-context-notes', entityType, entityId];

  const { data: notes = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('entity_context_notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EntityContextNote[];
    },
    enabled: !!entityId,
  });

  const createNote = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('entity_context_notes')
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          content: input.content,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Note de contexte ajoutée');
    },
    onError: (error) => {
      console.error('Error creating context note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
    },
  });

  const updateNote = useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      const { data, error } = await supabase
        .from('entity_context_notes')
        .update({ content: input.content })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Note mise à jour');
    },
    onError: (error) => {
      console.error('Error updating context note:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('entity_context_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Note supprimée');
    },
    onError: (error) => {
      console.error('Error deleting context note:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    notes,
    isLoading,
    error,
    refetch,
    createNote,
    updateNote,
    deleteNote,
  };
}
