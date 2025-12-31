import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const QUERY_KEY = 'cockpit-voice-transcriptions';
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export interface VoiceTranscription {
  id: string;
  workspace_id: string;
  storage_path: string;
  source: 'upload' | 'recording';
  lead_id: string | null;
  project_id: string | null;
  solution_id: string | null;
  raw_transcript: string | null;
  segments: Record<string, unknown> | null;
  summary: TranscriptionSummary | null;
  status: 'queued' | 'transcribing' | 'analyzing' | 'done' | 'error';
  auto_create_tasks: boolean;
  prompt_profile_id: string | null;
  ai_metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  lead?: { id: string; name: string; company: string | null } | null;
  project?: { id: string; name: string } | null;
  solution?: { id: string; title: string } | null;
  prompt_profile?: { id: string; name: string } | null;
}

export interface TranscriptionSummary {
  title: string;
  context: {
    date: string | null;
    participants: string[];
    company: string | null;
    lead_intent: string | null;
  };
  executive_summary: string;
  key_points: string[];
  decisions: string[];
  action_items: {
    task: string;
    owner: string | null;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high';
  }[];
  risks_blockers: string[];
  questions_open: string[];
  next_steps: string;
  crm_enrichment: {
    suggested_lead_score_delta: number | null;
    suggested_stage_change: string | null;
    suggested_tags: string[];
  };
  extraction_quality: {
    confidence: number;
    uncertainties: string[];
  };
}

export interface CreateTranscriptionInput {
  storage_path: string;
  source: 'upload' | 'recording';
  lead_id?: string | null;
  project_id?: string | null;
  solution_id?: string | null;
  auto_create_tasks?: boolean;
  prompt_profile_id?: string | null;
}

export const TRANSCRIPTION_STATUSES = [
  { value: 'queued', label: 'En attente', variant: 'secondary' as const },
  { value: 'transcribing', label: 'Transcription...', variant: 'default' as const },
  { value: 'analyzing', label: 'Analyse IA...', variant: 'default' as const },
  { value: 'done', label: 'Terminé', variant: 'default' as const },
  { value: 'error', label: 'Erreur', variant: 'destructive' as const },
];

export function useCockpitVoiceTranscriptions(
  workspaceId: string = DEFAULT_WORKSPACE_ID,
  entityType?: 'lead' | 'project' | 'solution',
  entityId?: string
) {
  const queryClient = useQueryClient();

  // Fetch transcriptions
  const { data: transcriptions = [], isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, workspaceId, entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('voice_transcriptions')
        .select(`
          *,
          lead:leads(id, name, company),
          project:projects(id, name),
          solution:articles(id, title),
          prompt_profile:ai_prompts(id, name)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (entityType === 'lead' && entityId) {
        query = query.eq('lead_id', entityId);
      } else if (entityType === 'project' && entityId) {
        query = query.eq('project_id', entityId);
      } else if (entityType === 'solution' && entityId) {
        query = query.eq('solution_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as VoiceTranscription[];
    },
  });

  // Fetch single transcription
  const useTranscription = (id: string) => {
    return useQuery({
      queryKey: [QUERY_KEY, 'detail', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('voice_transcriptions')
          .select(`
            *,
            lead:leads(id, name, company, email),
            project:projects(id, name, status),
            solution:articles(id, title, slug),
            prompt_profile:ai_prompts(id, name, slug)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data as unknown as VoiceTranscription;
      },
      enabled: !!id,
    });
  };

  // Create transcription job
  const createTranscription = useMutation({
    mutationFn: async (input: CreateTranscriptionInput) => {
      const { data, error } = await supabase.functions.invoke('create-voice-transcription', {
        body: {
          workspace_id: workspaceId,
          ...input,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to create transcription');
      return data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Transcription créée, traitement en cours...');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Process transcription
  const processTranscription = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('process-voice-transcription', {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (!data?.ok && !data?.already_done) {
        throw new Error(data?.error || 'Processing failed');
      }
      return data;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', jobId] });
    },
    onError: (error: Error) => {
      if (error.message.includes('rate_limited')) {
        toast.error('Limite de requêtes atteinte, réessayez plus tard');
      } else if (error.message.includes('credits_exhausted')) {
        toast.error('Crédits IA épuisés, veuillez recharger');
      } else {
        toast.error(`Erreur de traitement: ${error.message}`);
      }
    },
  });

  // Delete transcription
  const deleteTranscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('voice_transcriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Transcription supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Stats
  const stats = {
    total: transcriptions.length,
    done: transcriptions.filter(t => t.status === 'done').length,
    pending: transcriptions.filter(t => ['queued', 'transcribing', 'analyzing'].includes(t.status)).length,
    errors: transcriptions.filter(t => t.status === 'error').length,
  };

  return {
    transcriptions,
    isLoading,
    error,
    refetch,
    stats,
    createTranscription,
    processTranscription,
    deleteTranscription,
    useTranscription,
    TRANSCRIPTION_STATUSES,
  };
}

// Hook for fetching AI prompt profiles
export function useAIPromptProfiles(category = 'transcription') {
  return useQuery({
    queryKey: ['ai-prompts', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('id, name, slug, category')
        .eq('category', category)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
