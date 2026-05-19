import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type ActivityLogInsert = Database["public"]["Tables"]["activity_log"]["Insert"];

export const ACTIVITY_TYPES = [
  "note_added",
  "status_changed", 
  "task_created",
  "task_completed",
  "meeting_scheduled",
  "meeting_completed",
  "document_generated",
  "email_sent",
  "call_logged",
  "comment_added",
] as const;

export const useCockpitActivityLog = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading, error, refetch } = useQuery({
    queryKey: ["cockpit-activity-log", workspaceId],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select(`
          *,
          lead:leads(id, name, email),
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const useActivityByEntity = (entityType: string, entityId: string) => {
    return useQuery({
      queryKey: ["cockpit-activity-entity", entityType, entityId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("activity_log")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return data;
      },
      enabled: !!entityType && !!entityId,
    });
  };

  const logActivity = useMutation({
    mutationFn: async (activity: ActivityLogInsert) => {
      const { data, error } = await supabase
        .from("activity_log")
        .insert(activity)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-activity-log"] });
    },
    onError: (error) => {
      console.error("Error logging activity:", error);
    },
  });

  // Helper to log common activities
  const logStatusChange = async (
    entityType: string,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    workspaceId: string
  ) => {
    return logActivity.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "status_changed",
      title: `Statut changé: ${oldStatus} → ${newStatus}`,
      content: `Le statut a été modifié de "${oldStatus}" à "${newStatus}"`,
      workspace_id: workspaceId,
      visibility: "team",
    });
  };

  const logNote = async (
    entityType: string,
    entityId: string,
    note: string,
    workspaceId: string
  ) => {
    return logActivity.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "note_added",
      title: "Note ajoutée",
      content: note,
      workspace_id: workspaceId,
      visibility: "team",
    });
  };

  // Group activities by date for display
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = new Date(activity.created_at!).toLocaleDateString("fr-FR");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  return {
    activities,
    groupedActivities,
    isLoading,
    error,
    refetch,
    activityTypes: ACTIVITY_TYPES,
    logActivity,
    logStatusChange,
    logNote,
    useActivityByEntity,
  };
};
