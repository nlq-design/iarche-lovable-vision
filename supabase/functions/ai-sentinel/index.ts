import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  severity: "info" | "warning" | "critical";
  rule_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  raw_issue: string;
  stage?: string;
  status?: string;
  days_inactive?: number;
  last_activity_date?: string;
  created_at?: string;
}

// === Direct formatting templates (no LLM) ===
const ALERT_TEMPLATES: Record<string, (a: RawAnomaly) => { question: string; detail: string }> = {
  incomplete_lead_email: (a) => ({
    question: `${a.entity_name} n'a pas d'email renseigné`,
    detail: `Lead actif — compléter l'email pour pouvoir relancer`,
  }),
  incomplete_opp_amount: (a) => ({
    question: `Opportunité "${a.entity_name}" sans montant estimé`,
    detail: `Stage: ${a.stage || "inconnu"} — renseigner le montant pour le pipeline`,
  }),
  incomplete_project_budget: (a) => ({
    question: `Projet "${a.entity_name}" sans budget défini`,
    detail: `Status: ${a.status || "inconnu"} — définir le budget pour le suivi financier`,
  }),
  inconsistency_opp_won_lead_not: (a) => ({
    question: `Opportunité gagnée mais lead "${a.entity_name}" pas marqué "won"`,
    detail: `Incohérence à corriger — mettre à jour la qualification du lead`,
  }),
  inactivity_hot_lead: (a) => ({
    question: `Lead chaud "${a.entity_name}" inactif depuis ${a.days_inactive}j`,
    detail: `Dernière activité: ${a.last_activity_date || "inconnue"} — relancer rapidement`,
  }),
  inactivity_active_project: (a) => ({
    question: `Projet actif "${a.entity_name}" inactif depuis ${a.days_inactive}j`,
    detail: `Aucune activité depuis ${a.days_inactive} jours — vérifier l'avancement`,
  }),
};

function formatAnomaly(anomaly: RawAnomaly): SentinelAlert {
  const template = ALERT_TEMPLATES[anomaly.rule_type];
  const formatted = template
    ? template(anomaly)
    : { question: anomaly.raw_issue, detail: "" };

  return {
    id: `sentinel-${anomaly.category}-${anomaly.entity_type}-${anomaly.entity_id}`,
    severity: anomaly.severity,
    category: anomaly.category as SentinelAlert["category"],
    entity_type: anomaly.entity_type,
    entity_id: anomaly.entity_id,
    entity_name: anomaly.entity_name,
    question: formatted.question,
    detail: formatted.detail,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  try {
    const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
    if (!ws?.id) {
      return new Response(JSON.stringify({ alerts: [], total: 0 }), {
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
        category: "incomplete", severity: "warning", rule_type: "incomplete_lead_email",
        entity_type: "lead", entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        raw_issue: `Lead sans email — statut actif`,
      });
    }

    for (const o of oppsNoAmount || []) {
      anomalies.push({
        category: "incomplete", severity: "warning", rule_type: "incomplete_opp_amount",
        entity_type: "opportunity", entity_id: o.id,
        entity_name: o.title || "Opportunité",
        raw_issue: `Opportunité en étape "${o.stage}" sans montant estimé`,
        stage: o.stage,
      });
    }

    for (const p of projectsNoBudget || []) {
      anomalies.push({
        category: "incomplete", severity: "info", rule_type: "incomplete_project_budget",
        entity_type: "project", entity_id: p.id,
        entity_name: p.name || "Projet",
        raw_issue: `Projet "${p.status}" sans budget défini`,
        status: p.status,
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
            category: "inconsistency", severity: "critical", rule_type: "inconsistency_opp_won_lead_not",
            entity_type: "opportunity", entity_id: o.id,
            entity_name: lead.company || lead.name || o.title || "Opportunité",
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
        category: "inactivity", severity: "warning", rule_type: "inactivity_hot_lead",
        entity_type: "lead", entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        raw_issue: `Lead en phase "${l.qualification_status}" sans interaction depuis ${daysSince} jours`,
        days_inactive: daysSince,
        last_activity_date: new Date(l.updated_at).toLocaleDateString("fr-FR"),
      });
    }

    for (const p of staleProjects || []) {
      const daysSince = Math.floor((now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      anomalies.push({
        category: "inactivity", severity: "info", rule_type: "inactivity_active_project",
        entity_type: "project", entity_id: p.id,
        entity_name: p.name || "Projet",
        raw_issue: `Projet actif stagnant depuis ${daysSince} jours`,
        days_inactive: daysSince,
        last_activity_date: new Date(p.updated_at).toLocaleDateString("fr-FR"),
      });
    }

    if (!anomalies.length) {
      return new Response(JSON.stringify({ alerts: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // PHASE 2: Direct formatting (no LLM)
    // Sort by severity, cap at 8
    // ============================================================
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const alerts: SentinelAlert[] = anomalies.slice(0, 8).map(formatAnomaly);

    return new Response(
      JSON.stringify({ alerts, total: anomalies.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-sentinel] Error:", err);
    return new Response(JSON.stringify({ error: String(err), alerts: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
