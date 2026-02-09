import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callLLM } from "../_shared/ai-client.ts";
import { loadPrompt } from "../_shared/prompt-loader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SentinelAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "incomplete" | "inconsistency" | "inactivity";
  entity_type: string;
  entity_id: string;
  entity_name: string;
  question: string;
  detail: string;
}

interface RawAnomaly {
  category: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  raw_issue: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  try {
    const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
    if (!ws?.id) {
      return new Response(JSON.stringify({ alerts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // PHASE 1: Collect raw anomalies from DB (fast SQL checks)
    // ============================================================
    const anomalies: RawAnomaly[] = [];

    // --- INCOMPLETE DATA ---
    const [
      { data: leadsNoEmail },
      { data: oppsNoAmount },
      { data: projectsNoBudget },
    ] = await Promise.all([
      supabase.from("leads").select("id, name, company")
        .is("email", null).eq("workspace_id", ws.id).not("qualification_status", "eq", "lost").limit(5),
      supabase.from("opportunities").select("id, title, stage")
        .is("value_amount", null).eq("workspace_id", ws.id).not("stage", "eq", "lost").limit(5),
      supabase.from("projects").select("id, name, status")
        .is("budget_amount", null).eq("workspace_id", ws.id).in("status", ["active", "planning"]).limit(5),
    ]);

    for (const l of leadsNoEmail || []) {
      anomalies.push({
        category: "incomplete", entity_type: "lead", entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        raw_issue: `Lead sans email — statut actif`,
      });
    }

    for (const o of oppsNoAmount || []) {
      anomalies.push({
        category: "incomplete", entity_type: "opportunity", entity_id: o.id,
        entity_name: o.title || "Opportunité",
        raw_issue: `Opportunité en étape "${o.stage}" sans montant estimé`,
      });
    }

    for (const p of projectsNoBudget || []) {
      anomalies.push({
        category: "incomplete", entity_type: "project", entity_id: p.id,
        entity_name: p.name || "Projet",
        raw_issue: `Projet "${p.status}" sans budget défini`,
      });
    }

    // --- LOGICAL INCONSISTENCIES ---
    const { data: wonOpps } = await supabase
      .from("opportunities").select("id, title, lead_id")
      .eq("stage", "won").eq("workspace_id", ws.id).not("lead_id", "is", null).limit(10);

    if (wonOpps?.length) {
      const leadIds = [...new Set(wonOpps.map((o) => o.lead_id).filter(Boolean))];
      const { data: leads } = await supabase
        .from("leads").select("id, name, company, qualification_status")
        .in("id", leadIds).not("qualification_status", "eq", "won");

      const problemLeadMap = new Map((leads || []).map((l) => [l.id, l]));
      for (const o of wonOpps) {
        if (o.lead_id && problemLeadMap.has(o.lead_id)) {
          const lead = problemLeadMap.get(o.lead_id)!;
          anomalies.push({
            category: "inconsistency", entity_type: "opportunity", entity_id: o.id,
            entity_name: o.title || "Opportunité",
            raw_issue: `Opportunité marquée "won" mais lead "${lead.company || lead.name}" est en statut "${lead.qualification_status}"`,
          });
        }
      }
    }

    // --- INACTIVITY ---
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: hotLeads }, { data: staleProjects }] = await Promise.all([
      supabase.from("leads").select("id, name, company, qualification_status, updated_at")
        .eq("workspace_id", ws.id).in("qualification_status", ["r1", "r2", "negotiation"])
        .lt("updated_at", sevenDaysAgo).limit(5),
      supabase.from("projects").select("id, name, updated_at")
        .eq("workspace_id", ws.id).eq("status", "active")
        .lt("updated_at", fourteenDaysAgo).limit(5),
    ]);

    for (const l of hotLeads || []) {
      const daysSince = Math.floor((now.getTime() - new Date(l.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      anomalies.push({
        category: "inactivity", entity_type: "lead", entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        raw_issue: `Lead en phase "${l.qualification_status}" sans interaction depuis ${daysSince} jours`,
      });
    }

    for (const p of staleProjects || []) {
      const daysSince = Math.floor((now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      anomalies.push({
        category: "inactivity", entity_type: "project", entity_id: p.id,
        entity_name: p.name || "Projet",
        raw_issue: `Projet actif stagnant depuis ${daysSince} jours`,
      });
    }

    if (!anomalies.length) {
      return new Response(JSON.stringify({ alerts: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shuffled = anomalies.sort(() => Math.random() - 0.5).slice(0, 6);

    // ============================================================
    // PHASE 2: LLM generates smart, contextual questions
    // Load prompt dynamically from ai_prompts table
    // ============================================================
    const prompt = await loadPrompt(supabase, "sentinel-analysis", {
      system_prompt: `Tu es l'IA Sentinelle d'un CRM commercial. Transforme des anomalies en questions actionnables. Réponds en JSON valide.`,
    });

    const temperature = (prompt.model_config?.temperature as number) ?? 0.7;

    const userPrompt = `Voici ${shuffled.length} anomalies détectées dans le CRM. Transforme-les en questions pour le dirigeant :

${shuffled.map((a, i) => `[${i}] ${a.category} | ${a.entity_type} "${a.entity_name}" | ${a.raw_issue}`).join("\n")}`;

    let alerts: SentinelAlert[] = [];

    try {
      const llmResponse = await callLLM(
        [
          { role: "system", content: prompt.system_prompt },
          { role: "user", content: userPrompt },
        ],
        { functionName: "ai-sentinel", temperature }
      );

      const cleaned = llmResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        alerts = parsed.map((item: any, i: number) => {
          const source = shuffled[item.index ?? i];
          if (!source) return null;
          return {
            id: `sentinel-${source.category}-${source.entity_type}-${source.entity_id}`,
            severity: item.severity || "info",
            category: source.category as SentinelAlert["category"],
            entity_type: source.entity_type,
            entity_id: source.entity_id,
            entity_name: source.entity_name,
            question: item.question || source.raw_issue,
            detail: item.detail || "",
          };
        }).filter(Boolean) as SentinelAlert[];
      }
    } catch (llmErr) {
      console.warn("[ai-sentinel] LLM enrichment failed, using raw fallback:", llmErr);
      alerts = shuffled.map((a) => ({
        id: `sentinel-${a.category}-${a.entity_type}-${a.entity_id}`,
        severity: a.category === "inconsistency" ? "critical" as const : "warning" as const,
        category: a.category as SentinelAlert["category"],
        entity_type: a.entity_type, entity_id: a.entity_id, entity_name: a.entity_name,
        question: a.raw_issue, detail: "",
      }));
    }

    alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    return new Response(
      JSON.stringify({ alerts: alerts.slice(0, 8), total: anomalies.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-sentinel] Error:", err);
    return new Response(JSON.stringify({ error: String(err), alerts: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
