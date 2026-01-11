import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export const LEADS_QUERY_KEY = "leads";

/**
 * Hook partagé pour la gestion des leads
 * Utilisé par Admin ET Cockpit
 */
export const useLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all leads
  const { data: leads = [], isLoading, error, refetch } = useQuery({
    queryKey: [LEADS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
  });

  // Create lead
  const createLead = useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const { data, error } = await supabase
        .from("leads")
        .insert(lead)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({ title: "Lead créé" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lead
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({ title: "Lead mis à jour" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lead (using cascade-safe RPC function)
  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_lead_cascade", { p_lead_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({ title: "Lead supprimé" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk delete leads (cascade-safe)
  const bulkDeleteLeads = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.rpc("delete_lead_cascade", { p_lead_id: id });
        if (error) throw error;
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      toast({ title: `${ids.length} lead(s) supprimé(s)` });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Computed stats
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.qualification_status === "new").length,
    contacted: leads.filter((l) => l.qualification_status === "contacted").length,
    qualified: leads.filter((l) => l.qualification_status === "qualified").length,
    converted: leads.filter((l) => l.qualification_status === "converted").length,
    lost: leads.filter((l) => l.qualification_status === "lost").length,
    withConsent: leads.filter((l) => l.consent_marketing).length,
    bySource: {
      newsletter: leads.filter((l) => l.source === "newsletter").length,
      atelier: leads.filter((l) => l.source === "atelier-webinaire").length,
      livreBlanc: leads.filter((l) => l.source === "livre-blanc").length,
      contact: leads.filter((l) => l.source === "contact").length,
    },
  };

  return {
    leads,
    isLoading,
    error,
    refetch,
    stats,
    createLead,
    updateLead,
    deleteLead,
    bulkDeleteLeads,
  };
};

/**
 * Hook pour filtrer les leads par statut de qualification
 */
export const useLeadsByStatus = (status: string) => {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, "status", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("qualification_status", status)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook pour filtrer les leads par source
 */
export const useLeadsBySource = (source: string) => {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, "source", source],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("source", source)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
