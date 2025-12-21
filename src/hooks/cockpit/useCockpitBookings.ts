import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookings, BOOKING_QUERY_KEY } from "@/hooks/shared/useBookings";
import { startOfWeek, endOfWeek, isAfter, isBefore } from "date-fns";

/**
 * Hook Cockpit pour les rendez-vous
 * ÉTEND useBookings avec fonctionnalités cockpit-specific
 * 
 * @see docs/COCKPIT_DEV_CHARTER.md
 */
export const useCockpitBookings = () => {
  // Réutilise le hook partagé
  const baseHook = useBookings();

  // Hook pour les RDV d'aujourd'hui
  const useTodayBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return useQuery({
      queryKey: [BOOKING_QUERY_KEY, "today"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`*, booking_types (id, name, slug, duration_minutes, color)`)
          .gte("start_time", today.toISOString())
          .lt("start_time", tomorrow.toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true });

        if (error) throw error;
        return data;
      },
    });
  };

  // Hook pour les prochains RDV
  const useUpcomingBookings = (limit: number = 10) => {
    return useQuery({
      queryKey: [BOOKING_QUERY_KEY, "upcoming", limit],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`*, booking_types (id, name, slug, duration_minutes, color)`)
          .gte("start_time", new Date().toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(limit);

        if (error) throw error;
        return data;
      },
    });
  };

  // Stats enrichies pour le cockpit
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const cockpitStats = {
    ...baseHook.stats,
    thisWeek: baseHook.bookings.filter((b) => {
      const bookingDate = new Date(b.start_time);
      return (
        isAfter(bookingDate, weekStart) &&
        isBefore(bookingDate, weekEnd) &&
        b.status !== "cancelled"
      );
    }).length,
  };

  return {
    // Données de base depuis le hook partagé
    bookings: baseHook.bookings,
    isLoading: baseHook.isLoading,
    error: baseHook.error,
    refetch: baseHook.refetch,
    
    // Stats enrichies
    stats: cockpitStats,
    
    // Mutations du hook partagé
    createBooking: baseHook.createBooking,
    updateBooking: baseHook.updateBooking,
    cancelBooking: baseHook.cancelBooking,
    
    // Hooks cockpit-specific
    useTodayBookings,
    useUpcomingBookings,
  };
};
