import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface VivierCampaign {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  html_content: string | null;
  text_content: string | null;
  template_theme: string | null;
  variables: Json;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  test_sent_at: string | null;
  test_recipients: string[] | null;
  sender_name: string | null;
  sender_email: string | null;
  reply_to: string | null;
  daily_limit: number | null;
  total_recipients: number | null;
  sent_count: number | null;
  open_count: number | null;
  open_rate: number | null;
  click_count: number | null;
  click_rate: number | null;
  reply_count: number | null;
  reply_rate: number | null;
  bounce_count: number | null;
  bounce_rate: number | null;
  created_at: string;
  updated_at: string | null;
  metadata: Json;
  // Instantly integration fields
  instantly_campaign_id: string | null;
  instantly_status: string | null;
  instantly_account_id: string | null;
  last_synced_at: string | null;
  launched_at: string | null;
  // Schedule fields
  schedule_days: Json | null;
  schedule_timezone: string | null;
  schedule_from: string | null;
  schedule_to: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  vivier_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  company: string | null;
  company_name: string | null;
  status: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  bounce_type: string | null;
  bounce_reason: string | null;
  unsubscribed_at: string | null;
  open_count: number | null;
  click_count: number | null;
  click_urls: Json | null;
  variables_data: Json | null;
  custom_variables: Json | null;
  source: string | null;
  import_batch_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignStats {
  total: number;
  pending: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

export function useVivierCampaignDetail(slug: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch campaign by slug
  const campaignQuery = useQuery({
    queryKey: ['vivier-campaign', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      
      const { data, error } = await supabase
        .from('vivier_campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as unknown as VivierCampaign;
    },
    enabled: !!slug,
  });

  // Fetch recipients
  const recipientsQuery = useQuery({
    queryKey: ['vivier-campaign-recipients', campaignQuery.data?.id],
    queryFn: async () => {
      if (!campaignQuery.data?.id) return [];
      
      const { data, error } = await supabase
        .from('vivier_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignQuery.data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CampaignRecipient[];
    },
    enabled: !!campaignQuery.data?.id,
  });

  // Compute stats from recipients
  const recipients = recipientsQuery.data || [];
  const stats: CampaignStats = {
    total: recipients.length,
    pending: recipients.filter(r => r.status === 'pending' || r.status === 'draft').length,
    sent: recipients.filter(r => r.status === 'sent' || r.sent_at).length,
    opened: recipients.filter(r => r.opened_at).length,
    clicked: recipients.filter(r => r.clicked_at).length,
    replied: recipients.filter(r => r.replied_at).length,
    bounced: recipients.filter(r => r.status === 'bounced' || r.bounced_at).length,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0,
  };

  // Calculate rates
  if (stats.sent > 0) {
    stats.openRate = Math.round((stats.opened / stats.sent) * 100);
    stats.replyRate = Math.round((stats.replied / stats.sent) * 100);
    stats.bounceRate = Math.round((stats.bounced / stats.sent) * 100);
  }
  if (stats.opened > 0) {
    stats.clickRate = Math.round((stats.clicked / stats.opened) * 100);
  }

  // Update campaign
  const updateCampaign = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!campaignQuery.data?.id) throw new Error('No campaign loaded');
      
      const { error } = await supabase
        .from('vivier_campaigns')
        .update(updates as never)
        .eq('id', campaignQuery.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaign', slug] });
      toast({ title: 'Campagne mise à jour' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Add recipients
  const addRecipients = useMutation({
    mutationFn: async (newRecipients: Array<{ email: string; name?: string; company?: string; variables_data?: Record<string, unknown> }>) => {
      if (!campaignQuery.data?.id) throw new Error('No campaign loaded');
      
      const toInsert = newRecipients.map(r => ({
        campaign_id: campaignQuery.data!.id,
        email: r.email.toLowerCase().trim(),
        name: r.name || null,
        company: r.company || null,
        variables_data: (r.variables_data || {}) as Json,
        status: 'pending',
        source: 'manual',
      }));

      const { error } = await supabase
        .from('vivier_campaign_recipients')
        .upsert(toInsert as never[], { onConflict: 'campaign_id,email', ignoreDuplicates: true });

      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaign-recipients'] });
      toast({ title: 'Recipients ajoutés', description: `${count} recipients importés` });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // Delete recipient
  const deleteRecipient = useMutation({
    mutationFn: async (recipientId: string) => {
      const { error } = await supabase
        .from('vivier_campaign_recipients')
        .delete()
        .eq('id', recipientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-campaign-recipients'] });
      toast({ title: 'Recipient supprimé' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  return {
    campaign: campaignQuery.data,
    recipients: recipientsQuery.data || [],
    stats,
    isLoading: campaignQuery.isLoading || recipientsQuery.isLoading,
    isError: campaignQuery.isError,
    error: campaignQuery.error,
    updateCampaign,
    addRecipients,
    deleteRecipient,
    refetch: () => {
      campaignQuery.refetch();
      recipientsQuery.refetch();
    },
  };
}
