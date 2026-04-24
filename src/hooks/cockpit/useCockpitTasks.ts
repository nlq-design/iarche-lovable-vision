import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const TASK_TYPES = ['follow_up', 'call', 'email', 'meeting', 'proposal', 'other'] as const;

export function useCockpitTasks(workspaceId?: string, entityType?: string, entityId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ctxWorkspaceId = useWorkspaceId();
  const effectiveWorkspaceId = workspaceId ?? ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

  // Fetch tasks — exclude harvested/cancelled, apply sensible limit
  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-tasks', effectiveWorkspaceId, entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          leads:lead_id (id, name, email, company),
          opportunities:opportunity_id (id, title),
          projects:project_id (id, name)
        `)
        .eq('workspace_id', effectiveWorkspaceId)
        .not('status', 'in', '("harvested","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false });

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }

      // Paginate to avoid Supabase 1000-row default limit
      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Fetch today's tasks
  const useTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    
    return useQuery({
      queryKey: ['cockpit-tasks', 'today', effectiveWorkspaceId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', effectiveWorkspaceId)
          .eq('due_date', today)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('due_time', { ascending: true, nullsFirst: false });

        if (error) throw error;
        return data;
      },
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });
  };

  // Fetch overdue tasks
  const useOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    
    return useQuery({
      queryKey: ['cockpit-tasks', 'overdue', effectiveWorkspaceId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', effectiveWorkspaceId)
          .lt('due_date', today)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('due_date', { ascending: true });

        if (error) throw error;
        return data;
      },
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });
  };

  // Create task
  const createTask = useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      toast({
        title: 'Tâche créée',
        description: 'La tâche a été ajoutée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la tâche',
        variant: 'destructive',
      });
      console.error('Create task error:', error);
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la tâche',
        variant: 'destructive',
      });
      console.error('Update task error:', error);
    },
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      toast({
        title: 'Tâche terminée',
        description: 'La tâche a été marquée comme complète',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de terminer la tâche',
        variant: 'destructive',
      });
      console.error('Complete task error:', error);
    },
  });

  // Snooze task
  const snoozeTask = useMutation({
    mutationFn: async ({ id, until }: { id: string; until: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ snoozed_until: until })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      toast({
        title: 'Tâche reportée',
        description: 'La tâche a été reportée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de reporter la tâche',
        variant: 'destructive',
      });
      console.error('Snooze task error:', error);
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-tasks'] });
      toast({
        title: 'Tâche supprimée',
        description: 'La tâche a été retirée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la tâche',
        variant: 'destructive',
      });
      console.error('Delete task error:', error);
    },
  });

  // Stats
  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];
  const stats = {
    total: tasks?.length || 0,
    pending: pendingTasks.length,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    overdue: pendingTasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date(new Date().toISOString().split('T')[0]);
    }).length,
    dueToday: pendingTasks.filter(t => 
      t.due_date === new Date().toISOString().split('T')[0]
    ).length,
    highPriority: pendingTasks.filter(t => 
      t.priority === 'high' || t.priority === 'urgent'
    ).length,
  };

  return {
    tasks,
    isLoading,
    error,
    refetch,
    stats,
    TASK_STATUSES,
    TASK_PRIORITIES,
    TASK_TYPES,
    createTask,
    updateTask,
    completeTask,
    snoozeTask,
    deleteTask,
    useTodayTasks,
    useOverdueTasks,
  };
}
