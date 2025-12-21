import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectDocument {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  category: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

type ProjectDocumentInsert = Omit<ProjectDocument, 'id' | 'created_at' | 'updated_at'>;
type ProjectDocumentUpdate = Partial<Omit<ProjectDocument, 'id' | 'project_id' | 'workspace_id'>>;

export function useCockpitProjectDocuments(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading, error, refetch } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectDocument[];
    },
    enabled: !!projectId,
  });

  const createDocument = useMutation({
    mutationFn: async (doc: ProjectDocumentInsert) => {
      const { data, error } = await supabase
        .from('project_documents')
        .insert(doc)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document ajouté' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le document', variant: 'destructive' });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectDocumentUpdate }) => {
      const { data, error } = await supabase
        .from('project_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document mis à jour' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour', variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast({ title: 'Document supprimé' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    },
  });

  return {
    documents,
    isLoading,
    error,
    refetch,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}
