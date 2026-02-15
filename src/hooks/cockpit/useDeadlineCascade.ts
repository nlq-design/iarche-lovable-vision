import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CriticalPathItem {
  task: string;
  deadline: string;
  status: 'done' | 'in_progress' | 'blocked' | 'not_started';
  dependency: string | null;
  slack_days: number;
}

export interface RescheduleItem {
  task: string;
  current_deadline: string;
  suggested_deadline: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface BlockedMilestone {
  milestone: string;
  blocked_by: string;
  estimated_delay_days: number;
}

export interface OpportunityImpact {
  opportunities_affected: number;
  total_value_at_risk: number;
  details: Array<{
    name: string;
    value: number;
    impact_description: string;
  }>;
}

export interface CascadeRecommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  effort: string;
  expected_outcome: string;
}

export interface DeadlineCascadeData {
  project: {
    id: string;
    name: string;
    deadline: string;
    health_status: 'on_track' | 'at_risk' | 'critical' | 'blocked';
  };
  feasibility: {
    status: 'on_track' | 'at_risk' | 'impossible';
    confidence: number;
    summary: string;
  };
  critical_path: CriticalPathItem[];
  tasks_to_reschedule: RescheduleItem[];
  blocked_milestones: BlockedMilestone[];
  opportunity_impact: OpportunityImpact;
  recommendations: CascadeRecommendation[];
}

export function useDeadlineCascade(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['deadline-cascade', user?.id, projectId],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!projectId) throw new Error('Project ID requis');

      const response = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'deadline-cascade',
          entityId: projectId,
        },
      });

      if (response.error) throw response.error;
      return response.data as DeadlineCascadeData;
    },
    enabled: !!projectId && !!user,
    staleTime: 4 * 60 * 60 * 1000, // 4h cache
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
