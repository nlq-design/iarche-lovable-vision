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
      .eq("stage", "closed_won").eq("workspace_id", ws.id).not("lead_id", "is", null).limit(10);

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

    // ============================================================
    // PHASE 3: Create Action Proposals for critical/warning anomalies
    // ============================================================
    const PROPOSAL_TEMPLATES: Record<string, (a: RawAnomaly) => {
      action_type: string;
      action_label: string;
      action_payload: Record<string, unknown>;
      ai_reasoning: string;
    } | null> = {
      inactivity_hot_lead: (a) => ({
        action_type: "send_email",
        action_label: `Relancer ${a.entity_name} (${a.days_inactive}j inactif)`,
        action_payload: {
          lead_id: a.entity_id,
          email_type: "followup",
          context: `Lead chaud inactif depuis ${a.days_inactive} jours. Dernière activité: ${a.last_activity_date || "inconnue"}.`,
        },
        ai_reasoning: `[Sentinelle] Lead qualifié "hot" sans activité depuis ${a.days_inactive}j. Risque de perdre l'opportunité si pas de relance rapide.`,
      }),
      inactivity_active_project: (a) => ({
        action_type: "create_task",
        action_label: `Suivi projet ${a.entity_name} (${a.days_inactive}j sans activité)`,
        action_payload: {
          entity_type: "project",
          entity_id: a.entity_id,
          title: `Point de suivi – ${a.entity_name}`,
          description: `Projet actif sans activité depuis ${a.days_inactive} jours. Vérifier l'avancement et identifier les blocages.`,
          priority: (a.days_inactive || 0) > 21 ? "high" : "medium",
          due_in_days: 1,
        },
        ai_reasoning: `[Sentinelle] Projet actif stagnant depuis ${a.days_inactive}j. Un point de suivi est nécessaire pour détecter d'éventuels blocages.`,
      }),
      incomplete_lead_email: (a) => ({
        action_type: "update_lead",
        action_label: `Compléter email de ${a.entity_name}`,
        action_payload: {
          lead_id: a.entity_id,
          fields_to_complete: ["email"],
          context: "Email manquant — nécessaire pour les relances automatiques",
        },
        ai_reasoning: `[Sentinelle] Lead sans email, impossible de relancer automatiquement. Compléter cette donnée est prioritaire.`,
      }),
      inconsistency_opp_won_lead_not: (a) => ({
        action_type: "update_lead",
        action_label: `Corriger qualification de ${a.entity_name} → won`,
        action_payload: {
          lead_id: a.entity_id,
          qualification: "won",
          context: "Opportunité marquée \"won\" mais lead non mis à jour",
        },
        ai_reasoning: `[Sentinelle] Incohérence: opportunité gagnée mais lead pas marqué "won". Correction automatique pour garder le CRM propre.`,
      }),
      incomplete_opp_amount: (a) => ({
        action_type: "create_task",
        action_label: `Renseigner montant de "${a.entity_name}" (stage: ${a.stage || "?"})`,
        action_payload: {
          entity_type: "opportunity",
          entity_id: a.entity_id,
          title: `Compléter montant – ${a.entity_name}`,
          description: `Opportunité en stage "${a.stage || "inconnu"}" sans montant estimé. Renseigner pour le suivi pipeline.`,
          priority: "medium",
          due_in_days: 2,
        },
        ai_reasoning: `[Sentinelle] Opportunité sans montant estimé en stage "${a.stage}". Le pipeline financier est incomplet.`,
      }),
    };

    const proposableAnomalies = anomalies.filter(
      (a) => a.severity === "critical" || a.severity === "warning"
    );

    let proposalsCreatedCount = 0;

    if (proposableAnomalies.length > 0) {
      try {
        // Anti-dedup: check existing pending proposals from last 48h
        const { data: existingProposals } = await supabase
          .from("action_proposals")
          .select("action_label")
          .in("status", ["pending", "executed"])
          .eq("workspace_id", ws.id)
          .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

        const existingLabels = new Set((existingProposals || []).map((p: { action_label: string }) => p.action_label));

        const newProposals: Record<string, unknown>[] = [];
        for (const anomaly of proposableAnomalies) {
          const template = PROPOSAL_TEMPLATES[anomaly.rule_type];
          if (!template) continue;
          const proposal = template(anomaly);
          if (!proposal) continue;
          if (existingLabels.has(proposal.action_label)) continue;

          const AUTO_EXEC_TYPES = ['create_task', 'create_note'];
          newProposals.push({
            workspace_id: ws.id,
            status: "pending",
            action_type: proposal.action_type,
            action_label: proposal.action_label,
            action_payload: proposal.action_payload,
            ai_reasoning: proposal.ai_reasoning,
            auto_execute: AUTO_EXEC_TYPES.includes(proposal.action_type),
            source: 'sentinel',
          });
        }

        if (newProposals.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from("action_proposals")
            .insert(newProposals)
            .select("id, action_type, action_label, auto_execute");

          if (insertError) {
            console.error("[sentinel] Error creating proposals:", insertError);
          } else {
            proposalsCreatedCount = (insertedData || []).length;
            console.log(`[sentinel] Created ${proposalsCreatedCount} action proposals from anomalies`);

            // Auto-execute low-risk proposals (Option B: synchronous)
            const autoExecProposals = (insertedData || []).filter((p: { auto_execute: boolean }) => p.auto_execute);
            for (const proposal of autoExecProposals) {
              try {
                const execRes = await fetch(
                  `${SUPABASE_URL}/functions/v1/execute-action-proposal`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({
                      proposal_id: proposal.id,
                      validation_notes: "Auto-exécuté par la Sentinelle (action low-risk)",
                    }),
                  }
                );
                const execBody = await execRes.text();
                console.log(`[sentinel] Auto-exec ${proposal.action_label}: ${execRes.status}`, execBody);
              } catch (e) {
                console.warn(`[sentinel] Auto-exec failed for ${proposal.action_label}:`, e);
              }
            }
          }
        }
      } catch (proposalErr) {
        console.error("[sentinel] Proposal creation failed:", proposalErr);
      }
    }

    return new Response(
      JSON.stringify({ alerts, total: anomalies.length, proposals_created: proposalsCreatedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-sentinel] Error:", err);
    return new Response(JSON.stringify({ error: String(err), alerts: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
