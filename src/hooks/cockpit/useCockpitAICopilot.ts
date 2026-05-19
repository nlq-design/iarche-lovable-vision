import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleAIError } from '@/lib/ai-error-handler';
import { toast as sonnerToast } from 'sonner';

type CopilotMode = 'suggest-tasks' | 'detect-inactivity' | 'health-check' | 'morning-brief' | 'next-step' | 'meeting-prep' | 'opportunity-score' | 'win-loss-analysis' | 'deadline-cascade' | 'harvest' | 'harvest-respond' | 'intelligence';

interface TaskSuggestion {
  title: string;
  description: string;
  priority: string;
  task_type: string;
  due_in_days: number;
  entity_type?: string;
  entity_id?: string;
  reasoning: string;
}

interface InactivityAlert {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  days_inactive: number;
  last_activity: string;
  severity: string;
  suggestion: string;
}

interface ProjectHealthCheck {
  project_id: string;
  project_name: string;
  current_health: string;
  computed_health: string;
  risk_factors: string[];
  budget_status: { consumed_pct: number; status: string };
  task_status: { total: number; overdue: number; completed: number };
  days_since_activity: number;
}

interface HealthSummary {
  total: number;
  on_track: number;
  at_risk: number;
  off_track: number;
}

interface NextStepSuggestion {
  next_action: string;
  action_type: string;
  reasoning: string;
  suggested_stage: string | null;
  urgency: string;
  talking_points: string[];
}

interface MeetingBriefing {
  summary: string;
  key_facts: string[];
  objectives: string[];
  talking_points: string[];
  questions_to_ask: string[];
  risks: string[];
  preparation_checklist: string[];
}

interface OpportunityScoreItem {
  opportunity_id: string;
  opportunity_title: string;
  stage: string;
  conversion_score: number;
  risk_level: string;
  primary_risk: string;
  recommended_action: string;
  days_in_stage: number;
  value_amount: number;
}

interface OpportunityScoreSummary {
  total: number;
  avg_score: number;
  high_risk: number;
  pipeline_value: number;
  weighted_value: number;
}

interface MorningBriefData {
  today_tasks: any[];
  overdue_tasks: any[];
  today_bookings: any[];
  inactivity_alerts: InactivityAlert[];
  health_summary: HealthSummary;
  project_checks: ProjectHealthCheck[];
  upcoming_deadlines: any[];
  pipeline_scores: OpportunityScoreItem[];
}

interface HarvestQuestion {
  question: string;
  related_task_ids: string[];
  context: string;
  suggested_actions: string[];
}

interface HarvestGroup {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  task_count: number;
  oldest_task_date: string;
  tasks: any[];
}

interface HarvestInterview {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  summary: string;
  questions: HarvestQuestion[];
  task_ids: string[];
}

interface HarvestResult {
  groups: HarvestGroup[];
  total: number;
  current_interview?: HarvestInterview;
  message?: string;
}

interface HarvestRespondResult {
  processed: number;
  action: string;
  new_tasks: any[];
  message: string;
}

export function useCockpitAICopilot(workspaceId?: string) {
  const queryClient = useQueryClient();

  const callCopilot = async (mode: CopilotMode, entityType?: string, entityId?: string, extra?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('cockpit-ai-copilot', {
      body: { mode, workspaceId, entityType, entityId, ...extra },
    });

    if (error) {
      handleAIError(error);
      throw error;
    }

    if (data?.error) {
      sonnerToast.error(data.error);
      throw new Error(data.error);
    }

    return data;
  };

  const suggestTasks = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType?: string; entityId?: string } = {}) => {
      const result = await callCopilot('suggest-tasks', entityType, entityId);
      return result.suggestions as TaskSuggestion[];
    },
  });

  const detectInactivity = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('detect-inactivity');
      return result as { alerts: InactivityAlert[]; total: number };
    },
  });

  const healthCheck = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('health-check');
      return result as { projects: ProjectHealthCheck[]; summary: HealthSummary };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
    },
  });

  const morningBrief = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('morning-brief');
      return result as { brief: string; data: MorningBriefData };
    },
  });

  const suggestNextStep = useMutation({
    mutationFn: async (entityId: string) => {
      const result = await callCopilot('next-step', undefined, entityId);
      return result as { suggestion: NextStepSuggestion; opportunity: { id: string; title: string; stage: string }; trace_id?: string };
    },
  });


  // Phase 2: Meeting prep
  const meetingPrep = useMutation({
    mutationFn: async (bookingId: string) => {
      const result = await callCopilot('meeting-prep', undefined, bookingId);
      return result as {
        briefing: MeetingBriefing;
        booking: { id: string; name: string; company: string; start_time: string; type: string };
      };
    },
  });

  // Phase 2: Opportunity scoring
  const opportunityScore = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('opportunity-score');
      return result as { scores: OpportunityScoreItem[]; summary: OpportunityScoreSummary };
    },
  });

  // Phase 3: Win/Loss analysis
  const winLossAnalysis = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('win-loss-analysis');
      return result as {
        analysis: {
          win_patterns: string[];
          loss_patterns: string[];
          avg_win_cycle_days?: number;
          avg_loss_cycle_days?: number;
          best_sources: string[];
          critical_stage: string;
          recommendations: string[];
          key_differentiators: string[];
        } | null;
        stats: { total: number; won: number; lost: number; win_rate: number; total_won_value?: number; total_lost_value?: number };
        message?: string;
      };
    },
  });

  // Phase 3: Deadline cascade
  const deadlineCascade = useMutation({
    mutationFn: async (projectId: string) => {
      const result = await callCopilot('deadline-cascade', undefined, projectId);
      return result as {
        cascade: {
          overall_status: string;
          deadline_feasibility: string;
          days_at_risk: number;
          critical_path: string[];
          tasks_to_reschedule: Array<{ task_title: string; current_due: string; suggested_due: string; reason: string }>;
          blocked_milestones?: string[];
          impact_on_opportunities?: string;
          recommendations: string[];
        };
        project: { id: string; name: string; planned_end_date: string; days_remaining: number | null };
        stats: { total_tasks: number; overdue: number; pending: number; completed: number };
      };
    },
  });

  // Create tasks from suggestions
  const createTasksFromSuggestions = useMutation({
    mutationFn: async (suggestions: TaskSuggestion[]) => {
      const tasks = suggestions.map((s) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + s.due_in_days);
        return {
          title: s.title,
          description: s.description,
          priority: s.priority,
          task_type: s.task_type,
          status: 'pending' as const,
          due_date: dueDate.toISOString().split('T')[0],
          workspace_id: workspaceId,
          entity_type: s.entity_type || null,
          entity_id: s.entity_id || null,
        };
      });

      const { data, error } = await supabase.from('tasks').insert(tasks).select();
      if (error) throw error;

      for (const task of data || []) {
        await supabase.from('activity_log').insert({
          workspace_id: workspaceId!,
          entity_type: task.entity_type || 'task',
          entity_id: task.entity_id || task.id,
          activity_type: 'ai_action',
          title: `Tâche IA créée: ${task.title}`,
          is_ai_generated: true,
          task_id: task.id,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      sonnerToast.success(`${data?.length || 0} tâche(s) ajoutée(s) par l'IA`);
    },
    onError: () => {
      sonnerToast.error('Impossible de créer les tâches');
    },
  });

  // Harvest: interview overdue AI tasks
  const harvest = useMutation({
    mutationFn: async (entityId?: string) => {
      const result = await callCopilot('harvest', undefined, entityId);
      return result as HarvestResult;
    },
  });

  // Harvest respond: process user answer
  const harvestRespond = useMutation({
    mutationFn: async ({ taskIds, response, action }: { taskIds: string[]; response: string; action: string }) => {
      const result = await callCopilot('harvest-respond', undefined, undefined, { taskIds, response, action });
      return result as HarvestRespondResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      sonnerToast.success(data.message);
    },
  });

  return {
    suggestTasks,
    detectInactivity,
    healthCheck,
    morningBrief,
    suggestNextStep,
    meetingPrep,
    opportunityScore,
    winLossAnalysis,
    deadlineCascade,
    createTasksFromSuggestions,
    harvest,
    harvestRespond,
  };
}
