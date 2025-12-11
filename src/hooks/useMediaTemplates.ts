import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EditorType = 'banner' | 'story' | 'thumbnail' | 'opengraph' | 'header-email' | 'post' | 'carousel' | 'presentation' | 'brevo-html';

export interface MediaTemplate {
  id: string;
  user_id: string;
  name: string;
  editor_type: EditorType;
  template_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useMediaTemplates(editorType?: EditorType) {
  const queryClient = useQueryClient();

  // Fetch templates (filtered by editor type if provided)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['media-templates', editorType],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('media_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (editorType) {
        query = query.eq('editor_type', editorType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaTemplate[];
    },
  });

  // Save new template
  const saveMutation = useMutation({
    mutationFn: async ({ name, templateData }: { name: string; templateData: Record<string, unknown> }) => {
      if (!editorType) throw new Error('Editor type required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('media_templates')
        .insert({
          name,
          editor_type: editorType,
          template_data: templateData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-templates'] });
      toast.success('Template sauvegardé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    },
  });

  // Rename template
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('media_templates')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-templates'] });
      toast.success('Template renommé');
    },
    onError: () => {
      toast.error('Erreur lors du renommage');
    },
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('media_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-templates'] });
      toast.success('Template supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    templates,
    isLoading,
    saveTemplate: saveMutation.mutate,
    renameTemplate: renameMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
