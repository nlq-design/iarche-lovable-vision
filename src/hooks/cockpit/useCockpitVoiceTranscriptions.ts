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
  lead_contact_id: string | null;
  project_id: string | null;
  solution_id: string | null;
  meeting_note_id: string | null;
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
  transcription_date: string | null;
  title: string | null; // Custom title (overrides summary.title if set)
  original_filename: string | null;
  slug: string | null; // Unique slug for audio URL routing
  // File metadata
  file_size_bytes: number | null;
  duration_seconds: number | null;
  audio_format: string | null;
  analysis_context: string | null;
  // AI Synthesis fields
  ai_documents_summary: string | null;
  synthesis_stale: boolean | null;
  // Joined relations
  lead?: { id: string; name: string; company: string | null; email?: string } | null;
  lead_contact?: { id: string; name: string; email: string | null; position: string | null } | null;
  project?: { id: string; name: string } | null;
  solution?: { id: string; title: string } | null;
  meeting_note?: { id: string; objectives: string | null; booking_id: string | null } | null;
  prompt_profile?: { id: string; name: string } | null;
  // Partners via junction table
  partners?: { partner: { id: string; name: string; slug: string | null; partner_type: string | null } }[];
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
  // next_steps is now merged into action_items via normalizeSummary
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
  meeting_note_id?: string | null;
  auto_create_tasks?: boolean;
  prompt_profile_id?: string | null;
  llm_model_id?: string | null;
  transcription_date?: string | null;
  pre_transcribed_text?: string | null; // For chunked transcription done client-side
  original_filename?: string | null;
  file_size_bytes?: number | null;
  duration_seconds?: number | null;
  audio_format?: string | null;
  analysis_context?: string | null; // Context to guide AI analysis
}

export interface LLMModel {
  id: string;
  provider: 'lovable' | 'openai' | 'anthropic' | 'openrouter';
  model_id: string;
  display_name: string;
  description: string | null;
  category: string;
  cost_tier: string;
  supports_vision: boolean;
  supports_tools: boolean;
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
          lead_contact:lead_contacts(id, name, email, position),
          project:projects(id, name),
          solution:articles(id, title),
          meeting_note:meeting_notes(id, objectives, booking_id),
          prompt_profile:ai_prompts(id, name),
          partners:transcription_partners(partner:partners(id, name, slug, partner_type))
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
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
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
            lead_contact:lead_contacts(id, name, email, position, phone),
            project:projects(id, name, status),
            solution:articles(id, title, slug),
            meeting_note:meeting_notes(id, objectives, booking_id, notes),
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

  // Process transcription (or re-analyze/re-transcribe)
  const processTranscription = useMutation({
    mutationFn: async ({ jobId, forceReanalyze = false, forceRetranscribe = false }: { jobId: string; forceReanalyze?: boolean; forceRetranscribe?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('process-voice-transcription', {
        body: { job_id: jobId, force_reanalyze: forceReanalyze, force_retranscribe: forceRetranscribe },
      });

      // When the function returns non-2xx, Supabase wraps it as a FunctionsHttpError.
      // Convert it to a regular Error message to avoid hard UI failures.
      if (error) {
        const msg = (error as any)?.message || 'Erreur de traitement (backend)';
        throw new Error(msg);
      }

      if (!data?.ok && !data?.already_done) {
        const msg = (data as any)?.message || data?.error || 'Processing failed';
        throw new Error(msg);
      }

      return data;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', jobId] });
    },
    onError: (error: Error) => {
      const msg = error.message || '';

      if (msg.includes('ASSEMBLYAI_TIMEOUT') || msg === 'timeout') {
        toast.error("Transcription audio trop longue (timeout). Clique sur 'Réessayer (découpage)' pour traiter l'audio en segments.", { duration: 8000 });
      } else if (msg.includes('LLM_TIMEOUT')) {
        toast.error("Analyse IA trop longue (timeout LLM). Ajoute un contexte court puis ré-essaie.", { duration: 6000 });
      } else if (msg.includes('rate_limited')) {
        toast.error('Limite de requêtes atteinte, réessayez dans quelques minutes');
      } else if (msg.includes('credits_exhausted')) {
        toast.error('Crédits IA épuisés, veuillez recharger');
      } else if (msg.includes('too_large') || msg.includes('file_too_large')) {
        toast.error("Fichier trop volumineux. Utilisez le découpage automatique lors de l'upload.");
      } else {
        toast.error(`Erreur de traitement: ${msg.slice(0, 150)}`);
      }
    },
  });

  // Update transcription (lead_id, project_id, title, transcription_date, analysis_context, etc.)
  const updateTranscription = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<VoiceTranscription, 'lead_id' | 'lead_contact_id' | 'project_id' | 'solution_id' | 'meeting_note_id' | 'title' | 'transcription_date' | 'analysis_context'>> }) => {
      const { error } = await supabase
        .from('voice_transcriptions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', variables.id] });
      toast.success('Transcription mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete transcription
  const deleteTranscription = useMutation({
    mutationFn: async (id: string) => {
      // First get the transcription to get storage_path
      const { data: transcription, error: fetchError } = await supabase
        .from('voice_transcriptions')
        .select('storage_path')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete from storage if path exists
      if (transcription?.storage_path) {
        await supabase.storage
          .from('voice-transcriptions')
          .remove([transcription.storage_path]);
      }
      
      // Delete the record
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
    updateTranscription,
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
    staleTime: 5 * 60 * 1000, // 5 minutes - prompts rarely change
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching available LLM models
export function useLLMModels() {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_models')
        .select('id, provider, model_id, display_name, description, category, cost_tier, supports_vision, supports_tools')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as LLMModel[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - models config rarely changes
    refetchOnWindowFocus: false,
  });
}

// Get LLM models grouped by category
export function useLLMModelsGrouped() {
  const { data: models = [], ...rest } = useLLMModels();
  
  const grouped = {
    fast: models.filter(m => m.category === 'fast'),
    balanced: models.filter(m => m.category === 'balanced'),
    premium: models.filter(m => m.category === 'premium'),
    reasoning: models.filter(m => m.category === 'reasoning'),
  };
  
  // Also group by provider for document generation selection
  const byProvider = {
    lovable: models.filter(m => m.provider === 'lovable'),
    openai: models.filter(m => m.provider === 'openai'),
    anthropic: models.filter(m => m.provider === 'anthropic'),
    openrouter: models.filter(m => m.provider === 'openrouter'),
  };
  
  return { models, grouped, byProvider, ...rest };
}
