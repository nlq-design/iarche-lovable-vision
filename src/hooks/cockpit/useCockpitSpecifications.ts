import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants/workspace";

type Specification = Database["public"]["Tables"]["specifications"]["Row"];
type SpecificationInsert = Database["public"]["Tables"]["specifications"]["Insert"];
type SpecificationUpdate = Database["public"]["Tables"]["specifications"]["Update"];

export const SPECIFICATION_STATUSES = ["draft", "in_review", "approved", "archived"] as const;

export const useCockpitSpecifications = (workspaceId?: string) => {
  const queryClient = useQueryClient();
  const ctxWorkspaceId = useWorkspaceId();
  const effectiveWorkspaceId = workspaceId ?? ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

  const { data: specifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ["cockpit-specifications", effectiveWorkspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specifications")
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq("workspace_id", effectiveWorkspaceId)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const useSpecificationsByProject = (projectId: string) => {
    return useQuery({
      queryKey: ["cockpit-specifications-project", projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("specifications")
          .select("*")
          .eq("project_id", projectId)
          .order("updated_at", { ascending: false });
        
        if (error) throw error;
        return data;
      },
      enabled: !!projectId,
    });
  };

  const invalidateAllSpecQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["cockpit-specifications"] });
    queryClient.invalidateQueries({ queryKey: ["cockpit-specifications-project"] });
  };

  const createSpecification = useMutation({
    mutationFn: async (spec: SpecificationInsert) => {
      const { data, error } = await supabase
        .from("specifications")
        .insert(spec)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllSpecQueries();
      toast.success("Cahier des charges créé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création");
      console.error(error);
    },
  });

  const updateSpecification = useMutation({
    mutationFn: async ({ id, ...updates }: SpecificationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("specifications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllSpecQueries();
      toast.success("Cahier des charges mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });

  const approveSpecification = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { data, error } = await supabase
        .from("specifications")
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString(),
          approved_by: approvedBy 
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllSpecQueries();
      toast.success("Cahier des charges approuvé");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'approbation");
      console.error(error);
    },
  });

  const deleteSpecification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("specifications")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllSpecQueries();
      toast.success("Cahier des charges supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });

  // Stats
  const stats = {
    total: specifications.length,
    draft: specifications.filter(s => s.status === "draft").length,
    inReview: specifications.filter(s => s.status === "in_review").length,
    approved: specifications.filter(s => s.status === "approved").length,
    aiGenerated: specifications.filter(s => s.ai_generated).length,
  };

  return {
    specifications,
    isLoading,
    error,
    refetch,
    stats,
    statuses: SPECIFICATION_STATUSES,
    createSpecification,
    updateSpecification,
    approveSpecification,
    deleteSpecification,
    useSpecificationsByProject,
  };
};
