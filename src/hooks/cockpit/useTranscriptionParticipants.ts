import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOwnerProfile } from '@/hooks/cockpit/useOwnerProfile';

export type PresenceStatus = 'present' | 'mentioned' | 'observer';
export type MeetingRole = 'animator' | 'decision_maker' | 'technical_expert' | 'commercial' | 'support';
export type LinkedEntityType = 'partner' | 'lead_contact' | 'lead' | 'project' | 'owner';

export interface TranscriptionParticipant {
  id: string;
  transcription_id: string;
  name: string;
  presence_status: PresenceStatus;
  role_in_meeting: MeetingRole | null;
  speaker_label: string | null;
  linked_entity_type: LinkedEntityType | null;
  linked_entity_id: string | null;
  ai_suggested_match: { type: string; id: string; name: string; confidence: number } | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export const PRESENCE_STATUSES: { value: PresenceStatus; label: string; emoji: string }[] = [
  { value: 'present', label: 'Présent', emoji: '🟢' },
  { value: 'mentioned', label: 'Mentionné', emoji: '💬' },
  { value: 'observer', label: 'Observateur', emoji: '👁️' },
];

export const MEETING_ROLES: { value: MeetingRole; label: string }[] = [
  { value: 'animator', label: 'Animateur' },
  { value: 'decision_maker', label: 'Décideur' },
  { value: 'technical_expert', label: 'Expert technique' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'support', label: 'Support' },
];

export const ENTITY_TYPE_LABELS: Record<LinkedEntityType, string> = {
  partner: 'Partenaire',
  lead_contact: 'Contact',
  lead: 'Lead',
  project: 'Projet',
  owner: 'Propriétaire',
};

export function useTranscriptionParticipants(transcriptionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['transcription-participants', transcriptionId];

  const { data: participants = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!transcriptionId) return [];
      const { data, error } = await supabase
        .from('transcription_participants')
        .select('*')
        .eq('transcription_id', transcriptionId)
        .order('presence_status', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TranscriptionParticipant[];
    },
    enabled: !!transcriptionId,
  });

  const upsertParticipant = useMutation({
    mutationFn: async (input: {
      name: string;
      presence_status?: PresenceStatus;
      role_in_meeting?: MeetingRole | null;
      speaker_label?: string | null;
      linked_entity_type?: LinkedEntityType | null;
      linked_entity_id?: string | null;
    }) => {
      if (!transcriptionId) throw new Error('No transcription ID');
      const { data, error } = await supabase
        .from('transcription_participants')
        .upsert({
          transcription_id: transcriptionId,
          name: input.name,
          presence_status: input.presence_status ?? 'present',
          role_in_meeting: input.role_in_meeting ?? null,
          speaker_label: input.speaker_label ?? null,
          linked_entity_type: input.linked_entity_type ?? null,
          linked_entity_id: input.linked_entity_id ?? null,
        }, { onConflict: 'transcription_id,name' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const updateParticipant = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TranscriptionParticipant> & { id: string }) => {
      const { error } = await supabase
        .from('transcription_participants')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      // P1: Persist link in cross-transcription memory
      if (updates.linked_entity_type && updates.linked_entity_id) {
        const participant = participants.find(p => p.id === id);
        if (participant) {
          try {
            // Fetch entity name for cache
            let entityName: string | null = null;
            if (updates.linked_entity_type === 'partner') {
              const { data } = await supabase.from('partners').select('name').eq('id', updates.linked_entity_id).single();
              entityName = data?.name ?? null;
            } else if (updates.linked_entity_type === 'lead_contact') {
              const { data } = await supabase.from('lead_contacts').select('name').eq('id', updates.linked_entity_id).single();
              entityName = data?.name ?? null;
            } else if (updates.linked_entity_type === 'lead') {
              const { data } = await supabase.from('leads').select('name').eq('id', updates.linked_entity_id).single();
              entityName = data?.name ?? null;
            } else if (updates.linked_entity_type === 'project') {
              const { data } = await supabase.from('projects').select('name').eq('id', updates.linked_entity_id).single();
              entityName = data?.name ?? null;
            }

            await supabase.from('participant_entity_mappings').upsert({
              workspace_id: '00000000-0000-0000-0000-000000000001',
              participant_name: participant.name,
              linked_entity_type: updates.linked_entity_type,
              linked_entity_id: updates.linked_entity_id,
              linked_entity_name: entityName,
              last_used_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,participant_name,linked_entity_type,linked_entity_id' });

            // Increment usage_count via raw SQL not available, use rpc or just ignore for now
          } catch (e) {
            console.warn('[useTranscriptionParticipants] Memory save failed:', e);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const deleteParticipant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transcription_participants')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Participant supprimé');
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  // Seed participants from LLM summary (called once after transcription)
  const seedFromSummary = useMutation({
    mutationFn: async (summaryParticipants: Array<{ name: string; role?: string; company?: string; crm_match?: { type: string; id: string; confidence: number } | null }>) => {
      if (!transcriptionId || !summaryParticipants?.length) return;
      
      const rows = summaryParticipants.map(p => ({
        transcription_id: transcriptionId,
        name: p.name,
        presence_status: 'present' as PresenceStatus,
        role_in_meeting: null as MeetingRole | null,
        ai_suggested_match: p.crm_match ? {
          type: p.crm_match.type,
          id: p.crm_match.id,
          name: p.name,
          confidence: p.crm_match.confidence,
        } : null,
        confidence_score: p.crm_match?.confidence ?? null,
      }));

      const { error } = await supabase
        .from('transcription_participants')
        .upsert(rows, { onConflict: 'transcription_id,name', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Search entities across partners, lead_contacts, leads, projects
  const searchEntities = async (query: string): Promise<Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }>> => {
    const limit = 10;
    
    let partnersQ = supabase.from('partners').select('id, name, company').order('name').limit(limit);
    let contactsQ = supabase.from('lead_contacts').select('id, name, email').order('name').limit(limit);
    let leadsQ = supabase.from('leads').select('id, name, company').order('name').limit(limit);
    let projectsQ = supabase.from('projects').select('id, name').order('name').limit(limit);

    if (query && query.length >= 2) {
      const q = `%${query}%`;
      partnersQ = supabase.from('partners').select('id, name, company').ilike('name', q).limit(limit);
      contactsQ = supabase.from('lead_contacts').select('id, name, email').ilike('name', q).limit(limit);
      leadsQ = supabase.from('leads').select('id, name, company').ilike('name', q).limit(limit);
      projectsQ = supabase.from('projects').select('id, name').ilike('name', q).limit(limit);
    }

    const [partners, contacts, leads, projects] = await Promise.all([partnersQ, contactsQ, leadsQ, projectsQ]);

    const results: Array<{ type: LinkedEntityType; id: string; name: string; subtitle?: string }> = [];

    partners.data?.forEach(p => results.push({ type: 'partner', id: p.id, name: p.name, subtitle: p.company ?? undefined }));
    contacts.data?.forEach(c => results.push({ type: 'lead_contact', id: c.id, name: c.name, subtitle: c.email ?? undefined }));
    leads.data?.forEach(l => results.push({ type: 'lead', id: l.id, name: l.name, subtitle: l.company ?? undefined }));
    projects.data?.forEach(p => results.push({ type: 'project', id: p.id, name: p.name }));

    return results;
  };

  // Cross-history: count how many other transcriptions mention this participant
  const getParticipantHistory = async (name: string): Promise<number> => {
    const { count } = await supabase
      .from('transcription_participants')
      .select('id', { count: 'exact', head: true })
      .eq('name', name);
    return (count ?? 1) - 1; // exclude current
  };

  return {
    participants,
    isLoading,
    upsertParticipant,
    updateParticipant,
    deleteParticipant,
    seedFromSummary,
    searchEntities,
    getParticipantHistory,
  };
}
