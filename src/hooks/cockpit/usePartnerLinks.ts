import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PartnerLinkType = 
  | "lead" 
  | "opportunity" 
  | "project" 
  | "task" 
  | "booking" 
  | "transcription" 
  | "solution" 
  | "document";

interface PartnerLink {
  id: string;
  partner_id: string;
  entity_id: string;
  entity_type: PartnerLinkType;
  role: string | null;
  created_at: string;
  entity_name?: string;
}

const TABLE_MAP: Record<PartnerLinkType, { table: string; fk: string; nameTable?: string; nameField?: string }> = {
  lead: { table: "lead_partners", fk: "lead_id", nameTable: "leads", nameField: "name" },
  opportunity: { table: "opportunity_partners", fk: "opportunity_id", nameTable: "opportunities", nameField: "title" },
  project: { table: "project_partners", fk: "project_id", nameTable: "projects", nameField: "name" },
  task: { table: "task_partners", fk: "task_id", nameTable: "tasks", nameField: "title" },
  booking: { table: "booking_partners", fk: "booking_id", nameTable: "bookings", nameField: "name" },
  transcription: { table: "transcription_partners", fk: "transcription_id", nameTable: "voice_transcriptions", nameField: "id" },
  solution: { table: "solution_partners", fk: "solution_id", nameTable: "articles", nameField: "title" },
  document: { table: "document_partners", fk: "document_id", nameTable: "generated_documents", nameField: "title" },
};

// Hook pour récupérer toutes les liaisons d'un partenaire
export function usePartnerAllLinks(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-all-links", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const allLinks: PartnerLink[] = [];

      // Fetch from all link tables in parallel
      const promises = Object.entries(TABLE_MAP).map(async ([type, config]) => {
        const { data, error } = await supabase
          .from(config.table as any)
          .select("*")
          .eq("partner_id", partnerId);

        if (error) {
          console.error(`Error fetching ${type} links:`, error);
          return [];
        }

        return (data || []).map((row: any) => ({
          id: row.id,
          partner_id: row.partner_id,
          entity_id: row[config.fk],
          entity_type: type as PartnerLinkType,
          role: row.role,
          created_at: row.created_at,
        }));
      });

      const results = await Promise.all(promises);
      results.forEach(links => allLinks.push(...links));

      return allLinks;
    },
    enabled: !!partnerId,
  });
}

// Hook générique pour gérer les liaisons d'une entité
export function useEntityPartners(entityType: PartnerLinkType, entityId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const config = TABLE_MAP[entityType];

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ["entity-partners", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from(config.table as any)
        .select("*, partner:partners(*)")
        .eq(config.fk, entityId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId,
  });

  const linkPartner = useMutation({
    mutationFn: async ({ partnerId, role }: { partnerId: string; role?: string }) => {
      const insertData = {
        [config.fk]: entityId,
        partner_id: partnerId,
        role,
      };
      
      const { error } = await supabase
        .from(config.table as any)
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-partners", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["partner-all-links"] });
      toast({ title: "Partenaire lié" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const unlinkPartner = useMutation({
    mutationFn: async (partnerId: string) => {
      const { error } = await supabase
        .from(config.table as any)
        .delete()
        .eq(config.fk, entityId)
        .eq("partner_id", partnerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-partners", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["partner-all-links"] });
      toast({ title: "Partenaire retiré" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  return { partners, isLoading, refetch, linkPartner, unlinkPartner };
}

// Comptage des liaisons par partenaire
export function usePartnerLinkCounts() {
  return useQuery({
    queryKey: ["partner-link-counts"],
    queryFn: async () => {
      const counts: Record<string, { total: number; byType: Record<PartnerLinkType, number> }> = {};

      const promises = Object.entries(TABLE_MAP).map(async ([type, config]) => {
        const { data, error } = await supabase
          .from(config.table as any)
          .select("partner_id");

        if (error) {
          console.error(`Error counting ${type} links:`, error);
          return { type, data: [] };
        }

        return { type, data: data || [] };
      });

      const results = await Promise.all(promises);
      
      results.forEach(({ type, data }) => {
        data.forEach((row: any) => {
          if (!counts[row.partner_id]) {
            counts[row.partner_id] = {
              total: 0,
              byType: {
                lead: 0, opportunity: 0, project: 0, task: 0,
                booking: 0, transcription: 0, solution: 0, document: 0,
              },
            };
          }
          counts[row.partner_id].total++;
          counts[row.partner_id].byType[type as PartnerLinkType]++;
        });
      });

      return counts;
    },
  });
}
