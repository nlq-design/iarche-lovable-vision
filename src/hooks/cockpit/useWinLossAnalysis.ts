import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WinLossData {
  stats: {
    won: number;
    lost: number;
    total_won_value: number;
    total_lost_value: number;
    win_rate: number;
  };
  analysis: {
    win_patterns: string[];
    loss_patterns: string[];
    best_sources: string[];
    critical_stage: string;
    recommendations: string[];
    key_differentiators: string[];
  };
}

export function useWinLossAnalysis() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['win-loss-analysis', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'win-loss-analysis',
        },
      });

      if (response.error) throw response.error;
      return response.data as WinLossData;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h cache
    refetchOnWindowFocus: false,
    enabled: false, // Lazy load
  });
}
