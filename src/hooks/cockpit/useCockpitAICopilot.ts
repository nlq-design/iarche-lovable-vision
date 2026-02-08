import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleAIError } from '@/lib/ai-error-handler';
import { toast as sonnerToast } from 'sonner';

type CopilotMode = 'suggest-tasks' | 'detect-inactivity' | 'health-check' | 'morning-brief' | 'next-step';

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

interface MorningBriefData {
  today_tasks: any[];
  overdue_tasks: any[];
  today_bookings: any[];
  inactivity_alerts: InactivityAlert[];
  health_summary: HealthSummary;
  project_checks: ProjectHealthCheck[];
}

export function useCockpitAICopilot(workspaceId?: string) {
  const queryClient = useQueryClient();

  const callCopilot = async (mode: CopilotMode, entityType?: string, entityId?: string) => {
    const { data, error } = await supabase.functions.invoke('cockpit-ai-copilot', {
      body: { mode, workspaceId, entityType, entityId },
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

  // Suggest tasks mutation
  const suggestTasks = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType?: string; entityId?: string } = {}) => {
      const result = await callCopilot('suggest-tasks', entityType, entityId);
      return result.suggestions as TaskSuggestion[];
    },
  });

  // Detect inactivity
  const detectInactivity = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('detect-inactivity');
      return result as { alerts: InactivityAlert[]; total: number };
    },
  });

  // Health check projects
  const healthCheck = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('health-check');
      return result as { projects: ProjectHealthCheck[]; summary: HealthSummary };
    },
    onSuccess: () => {
      // Refresh projects after health update
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
    },
  });

  // Morning brief
  const morningBrief = useMutation({
    mutationFn: async () => {
      const result = await callCopilot('morning-brief');
      return result as { brief: string; data: MorningBriefData };
    },
  });

  // Next step for opportunity
  const suggestNextStep = useMutation({
    mutationFn: async (entityId: string) => {
      const result = await callCopilot('next-step', undefined, entityId);
      return result as { suggestion: NextStepSuggestion; opportunity: { id: string; title: string; stage: string } };
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

      // Log AI action in activity
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

  return {
    suggestTasks,
    detectInactivity,
    healthCheck,
    morningBrief,
    suggestNextStep,
    createTasksFromSuggestions,
  };
}
