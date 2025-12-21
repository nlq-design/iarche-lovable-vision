import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MeetingNote = Database['public']['Tables']['meeting_notes']['Row'];
type MeetingNoteInsert = Database['public']['Tables']['meeting_notes']['Insert'];
type MeetingNoteUpdate = Database['public']['Tables']['meeting_notes']['Update'];

export function useCockpitMeetingNotes(workspaceId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all meeting notes
  const { data: meetingNotes, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-meeting-notes', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('meeting_notes')
        .select(`
          *,
          bookings:booking_id (id, name, email, company, start_time),
          opportunities:opportunity_id (id, title),
          projects:project_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch meeting notes by entity
  const useMeetingNotesByEntity = (entityType: 'opportunity' | 'project', entityId: string) => {
    return useQuery({
      queryKey: ['cockpit-meeting-notes', entityType, entityId],
      queryFn: async () => {
        const column = entityType === 'opportunity' ? 'opportunity_id' : 'project_id';
        
        const { data, error } = await supabase
          .from('meeting_notes')
          .select('*')
          .eq(column, entityId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!entityId,
    });
  };

  // Create meeting note
  const createMeetingNote = useMutation({
    mutationFn: async (note: MeetingNoteInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('meeting_notes')
        .insert({
          ...note,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-meeting-notes'] });
      toast({
        title: 'Note créée',
        description: 'Le compte-rendu a été enregistré',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la note',
        variant: 'destructive',
      });
      console.error('Create meeting note error:', error);
    },
  });

  // Update meeting note
  const updateMeetingNote = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MeetingNoteUpdate }) => {
      const { data, error } = await supabase
        .from('meeting_notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-meeting-notes'] });
      toast({
        title: 'Note mise à jour',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la note',
        variant: 'destructive',
      });
      console.error('Update meeting note error:', error);
    },
  });

  // Delete meeting note
  const deleteMeetingNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-meeting-notes'] });
      toast({
        title: 'Note supprimée',
        description: 'Le compte-rendu a été retiré',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la note',
        variant: 'destructive',
      });
      console.error('Delete meeting note error:', error);
    },
  });

  // Stats
  const stats = {
    total: meetingNotes?.length || 0,
    thisWeek: meetingNotes?.filter(n => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(n.created_at!) >= weekAgo;
    }).length || 0,
    withActionItems: meetingNotes?.filter(n => {
      const items = n.action_items as unknown[];
      return items && items.length > 0;
    }).length || 0,
  };

  return {
    meetingNotes,
    isLoading,
    error,
    refetch,
    stats,
    createMeetingNote,
    updateMeetingNote,
    deleteMeetingNote,
    useMeetingNotesByEntity,
  };
}
