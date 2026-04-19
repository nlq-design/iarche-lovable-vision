import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PER_RUN = 5; // Limit to avoid timeouts
const DELAY_MS = 2000; // Delay between calls to avoid rate limiting

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

interface StaleEntity {
  type: string;
  id: string;
  name: string;
  workspace_id?: string | null;
  table: string;
}

/**
 * Auto-Consulte Stale: CRON-triggered function that finds entities marked
 * as synthesis_stale=true and triggers recalculation via synthesize-entity-documents.
 *
 * Priority order: leads > projects > partners > articles > transcriptions
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();
  const results: Array<{ entity_type: string; entity_id: string; entity_name: string; success: boolean; error?: string }> = [];
  const counters: Record<string, { processed: number; success: number; failed: number }> = {
    lead: { processed: 0, success: 0, failed: 0 },
    project: { processed: 0, success: 0, failed: 0 },
    partner: { processed: 0, success: 0, failed: 0 },
    article: { processed: 0, success: 0, failed: 0 },
    transcription: { processed: 0, success: 0, failed: 0 },
  };

  try {
    const staleEntities: StaleEntity[] = [];

    // 1. Leads (highest priority)
    const { data: staleLeads } = await supabase
      .from("leads")
      .select("id, name, company, workspace_id")
      .eq("synthesis_stale", true)
      .order("updated_at", { ascending: true })
      .limit(MAX_PER_RUN);

    for (const lead of staleLeads || []) {
      staleEntities.push({
        type: "lead",
        id: lead.id,
        name: lead.company || lead.name || "Lead",
        workspace_id: lead.workspace_id,
        table: "leads",
      });
    }

    // 2. Projects
    let remaining = MAX_PER_RUN - staleEntities.length;
    if (remaining > 0) {
      const { data: staleProjects } = await supabase
        .from("projects")
        .select("id, name, workspace_id")
        .eq("synthesis_stale", true)
        .order("updated_at", { ascending: true })
        .limit(remaining);

      for (const project of staleProjects || []) {
        staleEntities.push({
          type: "project",
          id: project.id,
          name: project.name || "Projet",
          workspace_id: project.workspace_id,
          table: "projects",
        });
      }
    }

    // 3. Partners
    remaining = MAX_PER_RUN - staleEntities.length;
    if (remaining > 0) {
      const { data: stalePartners } = await supabase
        .from("partners")
        .select("id, name, workspace_id")
        .eq("synthesis_stale", true)
        .order("updated_at", { ascending: true })
        .limit(remaining);

      for (const partner of stalePartners || []) {
        staleEntities.push({
          type: "partner",
          id: partner.id,
          name: partner.name || "Partenaire",
          workspace_id: partner.workspace_id,
          table: "partners",
        });
      }
    }

    // 4. Articles (no workspace_id column - global)
    remaining = MAX_PER_RUN - staleEntities.length;
    if (remaining > 0) {
      const { data: staleArticles } = await supabase
        .from("articles")
        .select("id, title")
        .eq("synthesis_stale", true)
        .order("updated_at", { ascending: true })
        .limit(remaining);

      for (const article of staleArticles || []) {
        staleEntities.push({
          type: "article",
          id: article.id,
          name: article.title || "Article",
          workspace_id: null,
          table: "articles",
        });
      }
    }

    // 5. Transcriptions
    remaining = MAX_PER_RUN - staleEntities.length;
    if (remaining > 0) {
      const { data: staleTranscriptions } = await supabase
        .from("voice_transcriptions")
        .select("id, title, workspace_id")
        .eq("synthesis_stale", true)
        .order("updated_at", { ascending: true })
        .limit(remaining);

      for (const t of staleTranscriptions || []) {
        staleEntities.push({
          type: "transcription",
          id: t.id,
          name: t.title || "Transcription",
          workspace_id: t.workspace_id,
          table: "voice_transcriptions",
        });
      }
    }

    if (!staleEntities.length) {
      return new Response(JSON.stringify({ message: "Aucune entité stale trouvée", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-consulte-stale] Found ${staleEntities.length} stale entities to recalculate`);

    // Process each entity sequentially with delay
    for (const entity of staleEntities) {
      counters[entity.type].processed++;
      try {
        console.log(`[auto-consulte-stale] Recalculating: ${entity.type} "${entity.name}" (${entity.id})`);

        const body: Record<string, unknown> = {
          entity_type: entity.type,
          entity_id: entity.id,
        };
        if (entity.workspace_id) body.workspace_id = entity.workspace_id;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/synthesize-entity-documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          // Clear the stale flag on success (same pattern as the 3 existing types)
          await supabase.from(entity.table).update({ synthesis_stale: false }).eq("id", entity.id);

          counters[entity.type].success++;
          results.push({ entity_type: entity.type, entity_id: entity.id, entity_name: entity.name, success: true });
          console.log(`[auto-consulte-stale] ✅ ${entity.type} "${entity.name}" recalculated`);
        } else {
          const errorText = await response.text();
          counters[entity.type].failed++;
          results.push({
            entity_type: entity.type,
            entity_id: entity.id,
            entity_name: entity.name,
            success: false,
            error: errorText.slice(0, 200),
          });
          console.warn(`[auto-consulte-stale] ❌ ${entity.type} "${entity.name}" failed: ${errorText.slice(0, 200)}`);
        }

        // Delay to avoid rate limiting
        if (staleEntities.indexOf(entity) < staleEntities.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      } catch (err) {
        counters[entity.type].failed++;
        results.push({
          entity_type: entity.type,
          entity_id: entity.id,
          entity_name: entity.name,
          success: false,
          error: String(err).slice(0, 200),
        });
      }
    }

    // Log the batch activity
    const successCount = results.filter((r) => r.success).length;
    await supabase.from("activity_log").insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      entity_type: "system",
      entity_id: "auto-consulte-stale",
      activity_type: "ai_action",
      title: `Auto-Consulte: ${successCount}/${results.length} synthèses recalculées`,
      content: results.map((r) => `${r.success ? "✅" : "❌"} ${r.entity_type}: ${r.entity_name}`).join("\n"),
      is_ai_generated: true,
      metadata: {
        counters,
        elapsed_ms: Date.now() - startTime,
      },
    });

    const elapsed = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        processed: results.length,
        success: successCount,
        failed: results.length - successCount,
        elapsed_ms: elapsed,
        counters,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-consulte-stale] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
