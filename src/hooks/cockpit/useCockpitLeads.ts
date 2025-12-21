import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLeads, useLeadsByStatus as useLeadsByStatusBase, LEADS_QUERY_KEY } from "@/hooks/shared/useLeads";

/**
 * Hook Cockpit pour les leads
 * ÉTEND useLeads avec fonctionnalités cockpit-specific (qualification, scoring)
 * 
 * @see docs/COCKPIT_DEV_CHARTER.md
 */
export function useCockpitLeads() {
  // Réutilise le hook partagé
  const baseHook = useLeads();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wrapper pour useLeadsByStatus (rétrocompatibilité)
  const useLeadsByStatus = (status: string) => {
    return useLeadsByStatusBase(status);
  };

  // Mise à jour du statut de qualification (cockpit-only)
  const updateQualificationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({
          qualification_status: status,
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({
        title: "Statut mis à jour",
        description: "Le lead a été qualifié",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
      console.error("Update status error:", error);
    },
  });

  // Mise à jour du score lead (cockpit-only)
  const updateLeadScore = useMutation({
    mutationFn: async ({
      id,
      score,
      details,
    }: {
      id: string;
      score: number;
      details?: object;
    }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({
          lead_score: score,
          lead_score_details: details ? JSON.parse(JSON.stringify(details)) : {},
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({ title: "Score lead mis à jour" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Stats enrichies pour le cockpit (scoring)
  const leads = baseHook.leads || [];
  const highScoringLeads = leads.filter((l) => (l.lead_score || 0) >= 70);

  const cockpitStats = {
    ...baseHook.stats,
    highScoring: highScoringLeads.length,
    averageScore:
      leads.length > 0
        ? Math.round(
            leads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / leads.length
          )
        : 0,
  };

  return {
    // Données de base depuis le hook partagé
    leads,
    isLoading: baseHook.isLoading,
    error: baseHook.error,
    refetch: baseHook.refetch,
    
    // Stats enrichies
    stats: cockpitStats,
    
    // Mutations du hook partagé
    updateLead: baseHook.updateLead,
    
    // Mutations cockpit-only
    updateQualificationStatus,
    updateLeadScore,
    
    // Hooks de filtrage
    useLeadsByStatus,
  };
}
