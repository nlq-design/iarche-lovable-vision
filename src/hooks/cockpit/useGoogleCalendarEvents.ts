import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  meetLink: string | null;
  location: string | null;
  description: string | null;
  isSynced: boolean;
  source: "google_calendar";
}

/**
 * Hook pour récupérer les événements Google Calendar en temps réel
 * Utilisé dans le cockpit pour afficher l'agenda réel
 */
export const useGoogleCalendarEvents = (daysAhead = 30, daysBefore = 7) => {
  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["google-calendar-events", daysAhead, daysBefore],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-google-calendar", {
        body: { action: "get-events", daysAhead, daysBefore },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch events");

      return (data.events || []) as GoogleCalendarEvent[];
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });

  return { events, isLoading, error, refetch };
};
