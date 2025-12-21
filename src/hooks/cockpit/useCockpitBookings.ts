import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBookings, BOOKING_QUERY_KEY } from "@/hooks/shared/useBookings";
import { startOfWeek, endOfWeek, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

/**
 * Hook Cockpit pour les rendez-vous
 * ÉTEND useBookings avec fonctionnalités cockpit-specific
 * 
 * @see docs/COCKPIT_DEV_CHARTER.md
 */
export const useCockpitBookings = () => {
  // Réutilise le hook partagé
  const baseHook = useBookings();

  // RDV d'aujourd'hui - requête directe
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const { data: todayBookings = [], isLoading: loadingToday } = useQuery({
    queryKey: [BOOKING_QUERY_KEY, "today", todayStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, booking_types (id, name, slug, duration_minutes, color)`)
        .gte("start_time", todayStart.toISOString())
        .lt("start_time", todayEnd.toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Prochains RDV - requête directe
  const { data: upcomingBookings = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: [BOOKING_QUERY_KEY, "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, booking_types (id, name, slug, duration_minutes, color)`)
        .gte("start_time", new Date().toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

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
    
    // Données cockpit-specific (directement exposées)
    todayBookings,
    loadingToday,
    upcomingBookings,
    loadingUpcoming,
    
    // Mutations du hook partagé
    createBooking: baseHook.createBooking,
    updateBooking: baseHook.updateBooking,
    cancelBooking: baseHook.cancelBooking,
  };
};
