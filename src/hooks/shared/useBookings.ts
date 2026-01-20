import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  booking_types?: Database["public"]["Tables"]["booking_types"]["Row"] | null;
};
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export const BOOKING_QUERY_KEY = "bookings";

/**
 * Hook partagé pour la gestion des rendez-vous
 * Utilisé par Admin ET Cockpit
 */
export const useBookings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all bookings
  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: [BOOKING_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_types (id, name, slug, duration_minutes, color)
        `)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
  });

  // Default workspace ID (IArche Interne) - Phase 1.5 multi-tenant
  const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

  // Create booking
  const createBooking = useMutation({
    mutationFn: async (booking: BookingInsert) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          ...booking,
          workspace_id: booking.workspace_id || DEFAULT_WORKSPACE_ID,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      toast({ title: "Rendez-vous créé" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update booking
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
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      toast({ title: "Rendez-vous mis à jour" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: BookingUpdate = { status };
      
      if (status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      toast({ title: `Statut mis à jour : ${status}` });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel booking (with edge function for calendar sync)
  const cancelBooking = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.functions.invoke("calendar-booking", {
        body: { action: "cancel-booking", bookingId: id, reason },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOOKING_QUERY_KEY] });
      toast({ title: "Rendez-vous annulé" });
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
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    upcoming: bookings.filter(
      (b) => new Date(b.start_time) > new Date() && b.status !== "cancelled"
    ).length,
  };

  return {
    bookings,
    isLoading,
    error,
    refetch,
    stats,
    createBooking,
    updateBooking,
    updateStatus,
    cancelBooking,
  };
};

/**
 * Hook pour récupérer les types de rendez-vous
 */
export const useBookingTypes = () => {
  const { data: bookingTypes = [], isLoading } = useQuery({
    queryKey: ["booking-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  return { bookingTypes, isLoading };
};

/**
 * Hook pour récupérer les disponibilités
 */
export const useBookingAvailability = (bookingTypeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ["booking-availability", bookingTypeId],
    queryFn: async () => {
      if (!bookingTypeId) return [];
      
      const { data, error } = await supabase
        .from("booking_availability")
        .select("*")
        .eq("booking_type_id", bookingTypeId)
        .order("day_of_week");

      if (error) throw error;
      return data;
    },
    enabled: !!bookingTypeId,
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ dayOfWeek, isActive }: { dayOfWeek: number; isActive: boolean }) => {
      const existing = availabilities.find((a) => a.day_of_week === dayOfWeek);

      if (existing) {
        const { error } = await supabase
          .from("booking_availability")
          .update({ is_active: !existing.is_active })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("booking_availability").insert({
          booking_type_id: bookingTypeId,
          day_of_week: dayOfWeek,
          start_time: "09:00:00",
          end_time: "18:00:00",
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-availability", bookingTypeId] });
      toast({ title: "Disponibilité mise à jour" });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { availabilities, isLoading, toggleAvailability };
};
