import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export const useCockpitBookings = () => {
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["cockpit-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_type:booking_types(*)
        `)
        .order("start_time", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const useTodayBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return useQuery({
      queryKey: ["cockpit-bookings-today"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`*, booking_type:booking_types(*)`)
          .gte("start_time", today.toISOString())
          .lt("start_time", tomorrow.toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true });
        
        if (error) throw error;
        return data;
      },
    });
  };

  const useUpcomingBookings = (limit = 10) => {
    return useQuery({
      queryKey: ["cockpit-bookings-upcoming", limit],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("bookings")
          .select(`*, booking_type:booking_types(*)`)
          .gte("start_time", new Date().toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(limit);
        
        if (error) throw error;
        return data;
      },
    });
  };

  const createBooking = useMutation({
    mutationFn: async (booking: BookingInsert) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert(booking)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-bookings"] });
      toast.success("Rendez-vous créé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création du RDV");
      console.error(error);
    },
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, ...updates }: BookingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-bookings"] });
      toast.success("Rendez-vous mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled", 
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason 
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cockpit-bookings"] });
      toast.success("Rendez-vous annulé");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'annulation");
      console.error(error);
    },
  });

  // Stats
  const now = new Date();
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => new Date(b.start_time) > now && b.status !== "cancelled").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    thisWeek: bookings.filter(b => {
      const bookingDate = new Date(b.start_time);
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return bookingDate >= now && bookingDate <= weekFromNow && b.status !== "cancelled";
    }).length,
  };

  return {
    bookings,
    isLoading,
    error,
    refetch,
    stats,
    createBooking,
    updateBooking,
    cancelBooking,
    useTodayBookings,
    useUpcomingBookings,
  };
};
