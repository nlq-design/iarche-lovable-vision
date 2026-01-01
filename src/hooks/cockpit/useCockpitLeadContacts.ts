import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LeadContact {
  id: string;
  lead_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCockpitLeadContacts(leadId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading, error, refetch } = useQuery({
    queryKey: ["lead-contacts", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_contacts")
        .select("*")
        .eq("lead_id", leadId)
        .order("is_primary", { ascending: false })
        .order("created_at");

      if (error) throw error;
      return data as LeadContact[];
    },
    enabled: !!leadId,
  });

  const createContact = useMutation({
    mutationFn: async (contact: Omit<LeadContact, "id" | "created_at" | "updated_at" | "lead_id">) => {
      const { data, error } = await supabase
        .from("lead_contacts")
        .insert({
          ...contact,
          lead_id: leadId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-contacts", leadId] });
      toast({ title: "Contact ajouté" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadContact> & { id: string }) => {
      const { data, error } = await supabase
        .from("lead_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-contacts", leadId] });
      toast({ title: "Contact mis à jour" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-contacts", leadId] });
      toast({ title: "Contact supprimé" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const setPrimaryContact = useMutation({
    mutationFn: async (contactId: string) => {
      // D'abord, retirer le statut primary de tous les contacts
      await supabase
        .from("lead_contacts")
        .update({ is_primary: false })
        .eq("lead_id", leadId);

      // Puis définir le nouveau primary
      const { error } = await supabase
        .from("lead_contacts")
        .update({ is_primary: true })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-contacts", leadId] });
      toast({ title: "Contact principal défini" });
    },
  });

  return {
    contacts,
    isLoading,
    error,
    refetch,
    createContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
    primaryContact: contacts?.find((c) => c.is_primary),
  };
}
