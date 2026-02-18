import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleAIError } from '@/lib/ai-error-handler';
import { toast as sonnerToast } from 'sonner';

export interface IntelligenceAction {
  action: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  entity_type: string;
  entity_id: string;
  entity_name: string;
  reasoning: string;
  impact_value?: number;
}

export interface CrossSignal {
  signal: string;
  entities: Array<{ type: string; id: string; name: string }>;
  severity: 'high' | 'medium' | 'low';
}

export interface Prediction {
  prediction: string;
  confidence: number;
  timeframe: string;
  entities: Array<{ type: string; id: string; name: string }>;
  risk_type: 'opportunity' | 'risk';
}

export interface HealthOverview {
  global_score: number;
  pipeline_momentum: 'accelerating' | 'stable' | 'decelerating' | 'stalled';
  critical_count: number;
  improving: string[];
  degrading: string[];
}

export interface IntelligencePayload {
  top_actions: IntelligenceAction[];
  cross_signals: CrossSignal[];
  predictions: Prediction[];
  health_overview: HealthOverview;
  narrative_brief: string;
  stale_synthesis_impact: string;
  generated_at: string;
}

// Raw data that's also returned for widgets
export interface IntelligenceRawData {
  leads_count: number;
  opportunities_count: number;
  projects_count: number;
  today_tasks_count: number;
  overdue_tasks_count: number;
  today_bookings_count: number;
  stale_count: number;
  overdue_ai_count: number;
  health_summary: { on_track: number; at_risk: number; off_track: number };
  pipeline_value: number;
  weighted_value: number;
  win_rate: number;
  scoring: Array<{
    opportunity_id: string;
    opportunity_title: string;
    conversion_score: number;
    risk_level: string;
    recommended_action: string;
  }>;
}

export interface IntelligenceResult {
  intelligence: IntelligencePayload;
  raw: IntelligenceRawData;
}

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export function useCockpitIntelligence(workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const queryClient = useQueryClient();
  const [autoFetched, setAutoFetched] = useState(false);

  // Step 1: Read today's cached brief from DB (instant)
  const dailyBrief = useQuery({
    queryKey: ['daily-intelligence', workspaceId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_intelligence')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('generated_date', today)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        intelligence: data.intelligence as unknown as IntelligencePayload,
        raw: data.raw_data as unknown as IntelligenceRawData,
      } as IntelligenceResult;
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
  });

  // Step 2: LLM fallback mutation (only if no DB data)
  const intelligence = useMutation({
    mutationFn: async (): Promise<IntelligenceResult> => {
      const { data, error } = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: { mode: 'intelligence', workspaceId },
      });

      if (error) {
        handleAIError(error);
        throw error;
      }
      if (data?.error) {
        sonnerToast.error(data.error);
        throw new Error(data.error);
      }

      return data as IntelligenceResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
    },
  });

  // Auto-fetch: only trigger LLM if no DB data available
  useEffect(() => {
    if (
      !autoFetched &&
      !intelligence.isPending &&
      !intelligence.data &&
      !dailyBrief.data &&
      !dailyBrief.isLoading
    ) {
      const timer = setTimeout(() => {
        intelligence.mutate();
        setAutoFetched(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoFetched, intelligence, dailyBrief.data, dailyBrief.isLoading]);

  const refresh = useCallback(() => {
    intelligence.mutate();
  }, [intelligence]);

  return {
    intelligence,
    refresh,
    isLoading: intelligence.isPending || dailyBrief.isLoading,
    data: dailyBrief.data ?? intelligence.data ?? null,
    error: intelligence.error,
    isFromCache: !!dailyBrief.data,
  };
}
