import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewContext {
  entity_type: string;
  entity_id: string;
  missing_fields: string[];
  current_question: number;
  completed?: boolean;
}

export function useCockpitChatbotV2(workspaceId?: string) {
  const queryClient = useQueryClient();
  const [sessionId] = useState(() => crypto.randomUUID());

  const sendMessage = useMutation({
    mutationFn: async ({
      messages,
      mode = 'chat',
      interview_context,
    }: {
      messages: ChatMessage[];
      mode?: 'chat' | 'interview';
      interview_context?: InterviewContext;
    }) => {
      // Route through the full orchestrator for circular architecture
      const { data, error } = await supabase.functions.invoke('ai-agent-orchestrator', {
        body: {
          messages,
          session_id: sessionId,
          workspace_id: workspaceId,
        },
      });

      if (error) {
        if (error.message.includes('402')) {
          sonnerToast.error('Crédits insuffisants. Veuillez ajouter des crédits.');
        } else if (error.message.includes('429')) {
          sonnerToast.error('Trop de requêtes. Réessayez dans quelques instants.');
        } else {
          sonnerToast.error(error.message);
        }
        throw error;
      }

      if (data?.error) {
        sonnerToast.error(data.error);
        throw new Error(data.error);
      }

      return data;
    },
  });

  const startInterview = useMutation({
    mutationFn: async (context: Omit<InterviewContext, 'current_question'>) => {
      return sendMessage.mutateAsync({
        messages: [
          {
            role: 'user',
            content: `J'aimerais enrichir les données du ${context.entity_type}. Commençons.`,
          },
        ],
        mode: 'interview',
        interview_context: {
          ...context,
          current_question: 0,
        },
      });
    },
  });

  return {
    sendMessage,
    startInterview,
    sessionId,
  };
}
