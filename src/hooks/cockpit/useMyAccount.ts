import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface MyProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  notification_prefs: {
    email: boolean;
    telegram: boolean;
    daily_brief: boolean;
    sentinel_alerts: boolean;
  };
  onboarded_at: string | null;
  updated_at: string;
}

export interface MfaFactor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
}

export interface MyAccountThreshold {
  workspace_id: string;
  auto_action_confidence_threshold: number;
  rag_similarity_threshold: number;
  last_metrics: Record<string, unknown> | null;
  updated_at: string;
}

export function useMyAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const profileQ = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-account", "profile", user?.id],
    queryFn: async (): Promise<MyProfile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MyProfile;
    },
  });

  const mfaQ = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-account", "mfa", user?.id],
    queryFn: async (): Promise<MfaFactor[]> => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return [...(data?.totp ?? []), ...(data?.phone ?? [])] as MfaFactor[];
    },
  });

  const thresholdQ = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-account", "threshold", user?.id],
    queryFn: async (): Promise<MyAccountThreshold[]> => {
      const { data, error } = await supabase
        .from("workspace_ai_thresholds" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as MyAccountThreshold[];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<MyProfile>) => {
      if (!user) throw new Error("not_authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(patch as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-account", "profile"] });
      toast({ title: "Compte mis à jour" });
    },
    onError: (e: any) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const signOutEverywhere = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sessions fermées sur tous les appareils" });
      window.location.href = "/auth";
    },
  });

  return {
    user,
    profile: profileQ.data ?? null,
    mfaFactors: mfaQ.data ?? [],
    thresholds: thresholdQ.data ?? [],
    isLoading: profileQ.isLoading || mfaQ.isLoading,
    update,
    signOutEverywhere,
  };
}
