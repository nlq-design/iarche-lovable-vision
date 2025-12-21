import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
const HEALTH_STATUSES = ['on_track', 'at_risk', 'off_track'] as const;

export function useCockpitProjects(workspaceId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ['cockpit-projects', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          opportunities:opportunity_id (id, title, value_amount)
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

  // Create project
  const createProject = useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
      toast({
        title: 'Projet créé',
        description: 'Le projet a été ajouté',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le projet',
        variant: 'destructive',
      });
      console.error('Create project error:', error);
    },
  });

  // Update project
  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectUpdate }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
      toast({
        title: 'Projet mis à jour',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le projet',
        variant: 'destructive',
      });
      console.error('Update project error:', error);
    },
  });

  // Update project status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: ProjectUpdate = { status };
      
      if (status === 'completed') {
        updates.actual_end_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du projet a été modifié',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
      console.error('Update status error:', error);
    },
  });

  // Update health status
  const updateHealthStatus = useMutation({
    mutationFn: async ({ id, healthStatus }: { id: string; healthStatus: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ health_status: healthStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'état de santé',
        variant: 'destructive',
      });
      console.error('Update health error:', error);
    },
  });

  // Delete project
  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cockpit-projects'] });
      toast({
        title: 'Projet supprimé',
        description: 'Le projet a été retiré',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le projet',
        variant: 'destructive',
      });
      console.error('Delete project error:', error);
    },
  });

  // Stats
  const stats = {
    total: projects?.length || 0,
    active: projects?.filter(p => p.status === 'active').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
    onHold: projects?.filter(p => p.status === 'on_hold').length || 0,
    atRisk: projects?.filter(p => p.health_status === 'at_risk' || p.health_status === 'off_track').length || 0,
    totalBudget: projects?.reduce((sum, p) => sum + (Number(p.budget_amount) || 0), 0) || 0,
    consumedBudget: projects?.reduce((sum, p) => sum + (Number(p.consumed_amount) || 0), 0) || 0,
  };

  return {
    projects,
    isLoading,
    error,
    refetch,
    stats,
    PROJECT_STATUSES,
    HEALTH_STATUSES,
    createProject,
    updateProject,
    updateStatus,
    updateHealthStatus,
    deleteProject,
  };
}
