import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedbackParams {
  entityType: string;
  entityId?: string;
  sourceFunction: string;
  mode?: string;
  rating: -1 | 1;
  comment?: string;
  aiMetadata?: Record<string, unknown>;
}

export function useAIFeedback(workspaceId?: string) {
  const submitFeedback = useMutation({
    mutationFn: async (params: FeedbackParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('ai_feedback').insert({
        workspace_id: workspaceId || '00000000-0000-0000-0000-000000000001',
        user_id: user?.id,
        entity_type: params.entityType,
        entity_id: params.entityId,
        source_function: params.sourceFunction,
        mode: params.mode,
        rating: params.rating,
        comment: params.comment,
        ai_metadata: params.aiMetadata as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      toast.success(params.rating === 1 ? '👍 Merci pour votre retour !' : '👎 Retour enregistré, nous améliorons l\'IA');
    },
    onError: () => {
      toast.error('Impossible d\'enregistrer le retour');
    },
  });

  return { submitFeedback };
}
