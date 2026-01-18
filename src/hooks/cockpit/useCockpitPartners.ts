import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PartnerType = "expert_ia" | "independant" | "apport_affaires";

export interface Partner {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  partner_type: PartnerType;
  bio: string | null;
  linkedin_url: string | null;
  website: string | null;
  specialties: string[];
  avatar_url: string | null;
  commission_rate: number | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // User linking
  user_id: string | null;
  // AI Synthesis fields
  ai_documents_summary: string | null;
  synthesis_stale: boolean | null;
}

// Génère un slug à partir d'un texte
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: "expert_ia", label: "Expert IA" },
  { value: "independant", label: "Indépendant" },
  { value: "apport_affaires", label: "Apport d'affaires" },
];

export function useCockpitPartners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partners, isLoading, error, refetch } = useQuery({
    queryKey: ["cockpit-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as Partner[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - partners rarely change
    refetchOnWindowFocus: false,
  });

  // Inclut les partenaires supprimés (pour la corbeille)
  const { data: allPartners } = useQuery({
    queryKey: ["cockpit-partners-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Partner[];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createPartner = useMutation({
    mutationFn: async (partner: Omit<Partner, "id" | "created_at" | "updated_at" | "workspace_id" | "deleted_at" | "ai_documents_summary" | "synthesis_stale">) => {
      const { data, error } = await supabase
        .from("partners")
        .insert({
          ...partner,
          workspace_id: "00000000-0000-0000-0000-000000000001",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners"] });
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners-all"] });
      toast({ title: "Partenaire créé" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const updatePartner = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Partner> & { id: string }) => {
      const { data, error } = await supabase
        .from("partners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners"] });
      toast({ title: "Partenaire mis à jour" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners"] });
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners-all"] });
      toast({ title: "Partenaire supprimé définitivement" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  // Soft delete - met à la corbeille
  const softDeletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partners")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners"] });
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners-all"] });
      toast({ title: "Partenaire mis à la corbeille" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  // Restaurer depuis la corbeille
  const restorePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partners")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners"] });
      queryClient.invalidateQueries({ queryKey: ["cockpit-partners-all"] });
      toast({ title: "Partenaire restauré" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const stats = {
    total: partners?.length || 0,
    byType: {
      expert_ia: partners?.filter((p) => p.partner_type === "expert_ia").length || 0,
      independant: partners?.filter((p) => p.partner_type === "independant").length || 0,
      apport_affaires: partners?.filter((p) => p.partner_type === "apport_affaires").length || 0,
    },
    active: partners?.filter((p) => p.is_active).length || 0,
    deleted: allPartners?.filter((p) => p.deleted_at != null).length || 0,
  };

  return {
    partners,
    allPartners,
    isLoading,
    error,
    refetch,
    stats,
    createPartner,
    updatePartner,
    deletePartner,
    softDeletePartner,
    restorePartner,
  };
}

// Hook pour les partenaires liés à un projet
export function useProjectPartners(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projectPartners, isLoading } = useQuery({
    queryKey: ["project-partners", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_partners")
        .select("*, partner:partners(*)")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const linkPartner = useMutation({
    mutationFn: async ({ partnerId, role }: { partnerId: string; role?: string }) => {
      const { error } = await supabase.from("project_partners").insert({
        project_id: projectId,
        partner_id: partnerId,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-partners", projectId] });
      toast({ title: "Partenaire lié au projet" });
    },
  });

  const unlinkPartner = useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from("project_partners")
        .delete()
        .eq("project_id", projectId)
        .eq("partner_id", partnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-partners", projectId] });
      toast({ title: "Partenaire retiré" });
    },
  });

  return { projectPartners, isLoading, linkPartner, unlinkPartner };
}
