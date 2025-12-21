import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectNote {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  content: string | null;
  note_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type ProjectNoteInsert = Omit<ProjectNote, 'id' | 'created_at' | 'updated_at'>;
type ProjectNoteUpdate = Partial<Omit<ProjectNote, 'id' | 'project_id' | 'workspace_id'>>;

export function useCockpitProjectNotes(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes, isLoading, error, refetch } = useQuery({
    queryKey: ['project-notes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectNote[];
    },
    enabled: !!projectId,
  });

  const createNote = useMutation({
    mutationFn: async (note: ProjectNoteInsert) => {
      const { data, error } = await supabase
        .from('project_notes')
        .insert(note)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
      toast({ title: 'Synthèse ajoutée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter la synthèse', variant: 'destructive' });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectNoteUpdate }) => {
      const { data, error } = await supabase
        .from('project_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
      toast({ title: 'Synthèse mise à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour', variant: 'destructive' });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', projectId] });
      toast({ title: 'Synthèse supprimée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
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
