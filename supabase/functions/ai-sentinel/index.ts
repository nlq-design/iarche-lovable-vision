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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const alerts: SentinelAlert[] = [];
  const now = new Date();

  try {
    const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
    if (!ws?.id) {
      return new Response(JSON.stringify({ alerts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 1. INCOMPLETE DATA ---

    // Leads without email
    const { data: leadsNoEmail } = await supabase
      .from("leads")
      .select("id, name, company")
      .is("email", null)
      .eq("workspace_id", ws.id)
      .not("status", "eq", "lost")
      .limit(5);

    for (const l of leadsNoEmail || []) {
      alerts.push({
        id: `inc-lead-email-${l.id}`,
        severity: "warning",
        category: "incomplete",
        entity_type: "lead",
        entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        question: `Le lead "${l.company || l.name}" n'a pas d'email. Est-ce normal ?`,
        detail: "Un lead sans email ne peut pas recevoir de propositions ni être contacté automatiquement.",
      });
    }

    // Opportunities without amount
    const { data: oppsNoAmount } = await supabase
      .from("opportunities")
      .select("id, title, stage")
      .is("amount", null)
      .eq("workspace_id", ws.id)
      .not("stage", "eq", "lost")
      .limit(5);

    for (const o of oppsNoAmount || []) {
      alerts.push({
        id: `inc-opp-amount-${o.id}`,
        severity: "warning",
        category: "incomplete",
        entity_type: "opportunity",
        entity_id: o.id,
        entity_name: o.title || "Opportunité",
        question: `L'opportunité "${o.title}" n'a pas de montant estimé. Peux-tu l'évaluer ?`,
        detail: `Étape actuelle : ${o.stage}. Sans montant, le pipeline financier est faussé.`,
      });
    }

    // Projects without budget
    const { data: projectsNoBudget } = await supabase
      .from("projects")
      .select("id, name, status")
      .is("budget", null)
      .eq("workspace_id", ws.id)
      .in("status", ["active", "planning"])
      .limit(5);

    for (const p of projectsNoBudget || []) {
      alerts.push({
        id: `inc-proj-budget-${p.id}`,
        severity: "info",
        category: "incomplete",
        entity_type: "project",
        entity_id: p.id,
        entity_name: p.name || "Projet",
        question: `Le projet "${p.name}" n'a pas de budget défini. Tu veux l'ajouter ?`,
        detail: "Un projet sans budget empêche le suivi de rentabilité.",
      });
    }

    // --- 2. LOGICAL INCONSISTENCIES ---

    // Opportunities marked "won" but lead not in "won" stage
    const { data: wonOpps } = await supabase
      .from("opportunities")
      .select("id, title, lead_id")
      .eq("stage", "won")
      .eq("workspace_id", ws.id)
      .not("lead_id", "is", null)
      .limit(10);

    if (wonOpps?.length) {
      const leadIds = [...new Set(wonOpps.map((o) => o.lead_id).filter(Boolean))];
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, company, status")
        .in("id", leadIds)
        .not("status", "eq", "won");

      const problemLeadIds = new Set((leads || []).map((l) => l.id));
      for (const o of wonOpps) {
        if (o.lead_id && problemLeadIds.has(o.lead_id)) {
          const lead = leads?.find((l) => l.id === o.lead_id);
          alerts.push({
            id: `con-opp-won-lead-${o.id}`,
            severity: "critical",
            category: "inconsistency",
            entity_type: "opportunity",
            entity_id: o.id,
            entity_name: o.title || "Opportunité",
            question: `L'opportunité "${o.title}" est gagnée, mais le lead "${lead?.company || lead?.name}" est en statut "${lead?.status}". Incohérence ?`,
            detail: "Une opportunité gagnée devrait avoir un lead au statut 'won' ou 'client'.",
          });
        }
      }
    }

    // --- 3. SUSPICIOUS INACTIVITY ---

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Hot leads with no recent activity
    const { data: hotLeads } = await supabase
      .from("leads")
      .select("id, name, company, updated_at")
      .eq("workspace_id", ws.id)
      .in("status", ["r1", "r2", "negotiation"])
      .lt("updated_at", sevenDaysAgo)
      .limit(5);

    for (const l of hotLeads || []) {
      const daysSince = Math.floor((now.getTime() - new Date(l.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `ina-lead-${l.id}`,
        severity: daysSince > 14 ? "critical" : "warning",
        category: "inactivity",
        entity_type: "lead",
        entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        question: `Le lead "${l.company || l.name}" est en phase active mais sans interaction depuis ${daysSince} jours. On relance ?`,
        detail: `Dernière mise à jour : il y a ${daysSince} jours. Risque de refroidissement.`,
      });
    }

    // Active projects with no recent activity
    const { data: staleProjects } = await supabase
      .from("projects")
      .select("id, name, updated_at")
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .lt("updated_at", fourteenDaysAgo)
      .limit(5);

    for (const p of staleProjects || []) {
      const daysSince = Math.floor((now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `ina-proj-${p.id}`,
        severity: "warning",
        category: "inactivity",
        entity_type: "project",
        entity_id: p.id,
        entity_name: p.name || "Projet",
        question: `Le projet "${p.name}" est actif mais stagne depuis ${daysSince} jours. Tout va bien ?`,
        detail: "Un projet actif sans mouvement peut cacher un blocage non remonté.",
      });
    }

    // Shuffle and limit to avoid always showing the same alerts
    const shuffled = alerts.sort(() => Math.random() - 0.5);
    // Prioritize: critical first, then warning, then info — but keep some randomness
    const sorted = shuffled.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    return new Response(
      JSON.stringify({ alerts: sorted.slice(0, 8), total: alerts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-sentinel] Error:", err);
    return new Response(JSON.stringify({ error: String(err), alerts: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
