import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface VivierCampaign {
  id: string;
  name: string;
  slug?: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  subject?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  preview_text?: string | null;
  vivier_ids?: string[] | null;
  segment_criteria?: Json | null;
  sequence_steps?: Json | null;
  total_recipients?: number | null;
  sent_count?: number | null;
  delivered_count?: number | null;
  open_count?: number | null;
  open_rate?: number | null;
  click_count?: number | null;
  click_rate?: number | null;
  reply_count?: number | null;
  reply_rate?: number | null;
  bounce_count?: number | null;
  bounce_rate?: number | null;
  unsubscribe_count?: number | null;
  daily_limit?: number | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  domain_id?: string | null;
  instantly_campaign_id?: string | null;
  instantly_status?: string | null;
  ai_generated?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  last_synced_at?: string | null;
}

export type CampaignStatus = VivierCampaign['status'];

export const CAMPAIGN_STATUSES: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-slate-500' },
  scheduled: { label: 'Planifiée', color: 'bg-blue-500' },
  running: { label: 'En cours', color: 'bg-green-500' },
  paused: { label: 'En pause', color: 'bg-amber-500' },
  completed: { label: 'Terminée', color: 'bg-emerald-500' },
  cancelled: { label: 'Annulée', color: 'bg-red-500' },
};

interface CreateCampaignInput {
  name: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  preview_text?: string;
  vivier_ids?: string[];
  segment_criteria?: Record<string, unknown>;
  daily_limit?: number;
  scheduled_at?: string;
  list_id?: string; // Reference to vivier_list
}

export function useVivierCampaigns() {
  const queryClient = useQueryClient();

  // Fetch all campaigns
  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ['vivier-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vivier_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VivierCampaign[];
    },
  });

  // Stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.click_count || 0), 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.reply_count || 0), 0);
  const totalBounces = campaigns.reduce((sum, c) => sum + (c.bounce_count || 0), 0);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'running').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalSent,
    totalOpens,
    totalClicks,
    totalReplies,
    totalBounces,
    avgOpenRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
    avgClickRate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
    avgReplyRate: totalSent > 0 ? (totalReplies / totalSent) * 100 : 0,
  };

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      let criteria = input.segment_criteria;
      let recipientCount = 0;

      // If creating from a list, fetch the list details
      if (input.list_id) {
        const { data: list } = await supabase
          .from('vivier_lists')
          .select('*')
          .eq('id', input.list_id)
          .single();

        if (list) {
          criteria = list.criteria_json as Record<string, unknown>;
          recipientCount = list.lead_count || 0;
        }
      }

      const { data, error } = await supabase
        .from('vivier_campaigns')
        .insert({
          name: input.name,
          subject: input.subject,
          body_html: input.body_html,
          body_text: input.body_text,
          preview_text: input.preview_text,
          vivier_ids: input.vivier_ids || null,
          segment_criteria: criteria as Json,
          total_recipients: recipientCount,
          daily_limit: input.daily_limit || 50,
          scheduled_at: input.scheduled_at,
          status: 'draft',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaigns'] });
      toast.success('Campagne créée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update campaign
  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VivierCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('vivier_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaigns'] });
      toast.success('Campagne mise à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vivier_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaigns'] });
      toast.success('Campagne supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Change campaign status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const updates: Partial<VivierCampaign> = { status };
      
      if (status === 'running' && !campaigns.find(c => c.id === id)?.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('vivier_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaigns'] });
      toast.success(`Campagne ${CAMPAIGN_STATUSES[status].label.toLowerCase()}`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    campaigns,
    stats,
    isLoading,
    error,
    refetch,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    updateStatus,
  };
}

// Hook for single campaign
export function useVivierCampaign(id: string | null) {
  return useQuery({
    queryKey: ['vivier-campaign', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('vivier_campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as VivierCampaign | null;
    },
    enabled: !!id,
  });
}
