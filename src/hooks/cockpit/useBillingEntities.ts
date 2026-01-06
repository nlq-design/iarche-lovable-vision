import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface PaymentTerms {
  deposits: { percent: number; trigger: string }[];
  method: string;
}

export interface BillingEntity {
  id: string;
  name: string;
  legal_form: string | null;
  capital_amount: number | null;
  siren: string | null;
  tva_number: string | null;
  rcs_city: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  quote_prefix: string | null;
  quote_format: string | null;
  quote_sequence_start: number | null;
  current_quote_sequence: number | null;
  default_validity_days: number | null;
  default_payment_terms: PaymentTerms | null;
  default_tva_rate: number | null;
  cgv_template_id: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CgvTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content_html: string;
  version: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useBillingEntities() {
  const queryClient = useQueryClient();

  const { data: entities = [], isLoading, error } = useQuery({
    queryKey: ["billing-entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_entities")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        default_payment_terms: item.default_payment_terms as unknown as PaymentTerms | null,
      })) as BillingEntity[];
    },
  });

  const createEntity = useMutation({
    mutationFn: async (entity: Partial<BillingEntity> & { name: string }) => {
      const { default_payment_terms, ...rest } = entity;
      const insertData = {
        ...rest,
        default_payment_terms: default_payment_terms as unknown as Json | undefined,
      };
      const { data, error } = await supabase
        .from("billing_entities")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-entities"] });
      toast.success("Société créée avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const updateEntity = useMutation({
    mutationFn: async ({ id, default_payment_terms, ...updates }: Partial<BillingEntity> & { id: string }) => {
      const updateData = {
        ...updates,
        default_payment_terms: default_payment_terms as unknown as Json | undefined,
      };
      const { data, error } = await supabase
        .from("billing_entities")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-entities"] });
      toast.success("Société mise à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  const deleteEntity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("billing_entities")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-entities"] });
      toast.success("Société désactivée");
    },
  });

  const setDefaultEntity = useMutation({
    mutationFn: async (id: string) => {
      // First, remove default from all
      await supabase
        .from("billing_entities")
        .update({ is_default: false })
        .eq("is_default", true);

      // Then set the new default
      const { error } = await supabase
        .from("billing_entities")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-entities"] });
      toast.success("Société par défaut mise à jour");
    },
  });

  const generateQuoteNumber = async (entityId: string): Promise<string> => {
    const { data, error } = await supabase.rpc("generate_next_quote_number", {
      p_billing_entity_id: entityId,
    });

    if (error) throw error;
    return data as string;
  };

  const defaultEntity = entities.find((e) => e.is_default) || entities[0];

  return {
    entities,
    isLoading,
    error,
    defaultEntity,
    createEntity,
    updateEntity,
    deleteEntity,
    setDefaultEntity,
    generateQuoteNumber,
  };
}

export function useCgvTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["cgv-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cgv_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as CgvTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<CgvTemplate>) => {
      const slug = template.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `cgv-${Date.now()}`;

      const { data, error } = await supabase
        .from("cgv_templates")
        .insert([{ 
          name: template.name || "",
          content_html: template.content_html || "",
          description: template.description,
          version: template.version,
          slug 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cgv-templates"] });
      toast.success("Template CGV créé");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CgvTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("cgv_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cgv-templates"] });
      toast.success("Template CGV mis à jour");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cgv_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cgv-templates"] });
      toast.success("Template désactivé");
    },
  });

  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  return {
    templates,
    isLoading,
    error,
    defaultTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
