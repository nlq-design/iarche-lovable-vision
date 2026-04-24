import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerAuth } from './usePartnerAuth';
import { toast } from 'sonner';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

// Types pour les créations
interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source: string;
  message?: string | null;
}

interface CreateProjectInput {
  name: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  target_end_date?: string | null;
  budget_amount?: number | null;
}

interface UpdateLeadInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
}

interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  target_end_date?: string | null;
}

export function usePartnerMutations() {
  const { partnerId } = usePartnerAuth();
  const queryClient = useQueryClient();

  // Création de lead
  const createLead = useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      if (!partnerId) throw new Error('Partner ID not found');

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          company: input.company || null,
          source: input.source,
          message: input.message || null,
          qualification_status: 'new',
          created_by_partner_id: partnerId,
          workspace_id: DEFAULT_WORKSPACE_ID,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Lead créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['partner-leads'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    },
    onError: (error) => {
      console.error('Error creating lead:', error);
      toast.error('Erreur lors de la création du lead');
    },
  });

  // Mise à jour de lead
  const updateLead = useMutation({
    mutationFn: async (input: UpdateLeadInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lead mis à jour');
      queryClient.invalidateQueries({ queryKey: ['partner-leads'] });
    },
    onError: (error) => {
      console.error('Error updating lead:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Suppression de lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lead supprimé');
      queryClient.invalidateQueries({ queryKey: ['partner-leads'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    },
    onError: (error) => {
      console.error('Error deleting lead:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  // Création de projet
  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (!partnerId) throw new Error('Partner ID not found');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          description: input.description || null,
          status: input.status || 'scoping',
          health_status: 'on_track',
          start_date: input.start_date || null,
          target_end_date: input.target_end_date || null,
          budget_amount: input.budget_amount || null,
          workspace_id: DEFAULT_WORKSPACE_ID,
          created_by_partner_id: partnerId,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Projet créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['partner-projects'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Erreur lors de la création du projet');
    },
  });

  // Mise à jour de projet
  const updateProject = useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projet mis à jour');
      queryClient.invalidateQueries({ queryKey: ['partner-projects'] });
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Suppression de projet
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projet supprimé');
      queryClient.invalidateQueries({ queryKey: ['partner-projects'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    createLead,
    updateLead,
    deleteLead,
    createProject,
    updateProject,
    deleteProject,
  };
}
