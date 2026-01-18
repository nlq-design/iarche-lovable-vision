import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';

export interface PartnerTimeEntry {
  id: string;
  partner_id: string;
  project_id: string | null;
  lead_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  status: 'pending' | 'validated' | 'rejected';
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
  lead?: { id: string; name: string; company: string | null } | null;
}

export interface CreateTimeEntryInput {
  project_id?: string | null;
  lead_id?: string | null;
  date: string;
  hours: number;
  description?: string;
}

export interface UpdateTimeEntryInput {
  id: string;
  project_id?: string | null;
  lead_id?: string | null;
  date?: string;
  hours?: number;
  description?: string;
}

export function usePartnerTimeEntries() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-time-entries', partnerId],
    queryFn: async (): Promise<PartnerTimeEntry[]> => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('partner_time_entries')
        .select(`
          *,
          project:projects(id, name),
          lead:leads(id, name, company)
        `)
        .eq('partner_id', partnerId)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(entry => ({
        ...entry,
        status: entry.status as 'pending' | 'validated' | 'rejected',
        project: entry.project as { id: string; name: string } | null,
        lead: entry.lead as { id: string; name: string; company: string | null } | null,
      }));
    },
    enabled: !!partnerId,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { partnerId } = usePartnerAuth();

  return useMutation({
    mutationFn: async (input: CreateTimeEntryInput) => {
      if (!partnerId) throw new Error('Partner ID required');

      const { data, error } = await supabase
        .from('partner_time_entries')
        .insert({
          partner_id: partnerId,
          project_id: input.project_id || null,
          lead_id: input.lead_id || null,
          date: input.date,
          hours: input.hours,
          description: input.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-time-entries'] });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTimeEntryInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('partner_time_entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-time-entries'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-time-entries'] });
    },
  });
}

export function usePartnerTimeStats() {
  const { partnerId } = usePartnerAuth();

  return useQuery({
    queryKey: ['partner-time-stats', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)).toISOString().split('T')[0];

      const { data: entries, error } = await supabase
        .from('partner_time_entries')
        .select('date, hours, status')
        .eq('partner_id', partnerId);

      if (error) throw error;

      const allEntries = entries || [];
      
      const thisMonth = allEntries
        .filter(e => e.date >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.hours), 0);

      const thisWeek = allEntries
        .filter(e => e.date >= startOfWeek)
        .reduce((sum, e) => sum + Number(e.hours), 0);

      const pending = allEntries
        .filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + Number(e.hours), 0);

      const validated = allEntries
        .filter(e => e.status === 'validated')
        .reduce((sum, e) => sum + Number(e.hours), 0);

      return {
        thisMonth: Math.round(thisMonth * 10) / 10,
        thisWeek: Math.round(thisWeek * 10) / 10,
        pendingHours: Math.round(pending * 10) / 10,
        validatedHours: Math.round(validated * 10) / 10,
        totalEntries: allEntries.length,
      };
    },
    enabled: !!partnerId,
  });
}
