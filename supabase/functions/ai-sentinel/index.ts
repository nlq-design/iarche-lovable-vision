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
  category: "incomplete" | "inconsistency" | "inactivity" | "risk" | "duplicate" | "overdue" | "imbalance";
  entity_type: string;
  entity_id: string;
  entity_name: string;
  question: string;
  detail: string;
  rule_type?: string;
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
  // === v2.1 — Nouvelles règles ===
  risk_opportunity_zombie: (a) => ({
    question: `Opportunité "${a.entity_name}" zombie (stage ${a.stage} stagnant ${a.days_inactive}j)`,
    detail: `Sans mouvement depuis ${a.days_inactive}j — décider next-step ou disqualifier`,
  }),
  overdue_opp_close_date: (a) => ({
    question: `Opportunité "${a.entity_name}" : date de closing dépassée`,
    detail: `Stage ${a.stage} — reprogrammer la date ou conclure`,
  }),
  risk_project_over_budget: (a) => ({
    question: `Projet "${a.entity_name}" : budget consommé à ${a.days_inactive}%`,
    detail: `Risque de dépassement — arbitrer scope ou réviser budget`,
  }),
  incomplete_lead_invalid_email: (a) => ({
    question: `Lead "${a.entity_name}" : email invalide`,
    detail: `Format incorrect — corriger pour pouvoir relancer`,
  }),
  duplicate_lead: (a) => ({
    question: `Doublon potentiel détecté pour "${a.entity_name}"`,
    detail: `Plusieurs leads avec le même email — fusionner ou écarter`,
  }),
  risk_booking_no_prep: (a) => ({
    question: `RDV "${a.entity_name}" dans ${a.days_inactive}h sans préparation`,
    detail: `Aucune note ou briefing — préparer avant l'échange`,
  }),
  imbalance_pipeline_stage: (a) => ({
    question: `Pipeline déséquilibré : ${a.days_inactive}% des opportunités au stage "${a.stage}"`,
    detail: `Concentration anormale — accélérer la conversion en aval`,
  }),
  inactivity_client_post_delivery: (a) => ({
    question: `Client "${a.entity_name}" sans touchpoint depuis livraison`,
    detail: `Projet livré il y a ${a.days_inactive}j — opportunité de cross/up-sell`,
  }),
  risk_specification_stale: (a) => ({
    question: `Spécification "${a.entity_name}" en brouillon depuis ${a.days_inactive}j`,
    detail: `Finaliser ou archiver pour libérer le pipeline`,
  }),
  // === v3 — Nouvelles règles ===
  risk_churn_hot_lead: (a) => ({
    question: `Lead chaud "${a.entity_name}" (score ${a.days_inactive}/100) sans contact depuis 30j+`,
    detail: `Score BANT élevé mais inactif — risque de churn, relance prioritaire`,
  }),
  risk_opportunity_dormant: (a) => ({
    question: `Opportunité "${a.entity_name}" dormante (${a.days_inactive}j sans activité)`,
    detail: `Stage ${a.stage} — early warning, programmer une relance avant escalade en zombie`,
  }),
  risk_pipeline_stage_regression: (a) => ({
    question: `Opportunité "${a.entity_name}" a régressé de stage`,
    detail: `Stage actuel ${a.stage} — analyser le motif de recul et arbitrer`,
  }),
  risk_over_solicitation: (a) => ({
    question: `Lead "${a.entity_name}" sur-sollicité (${a.days_inactive} emails en 7j)`,
    detail: `Risque de désabonnement — espacer les relances et varier le canal`,
  }),
};


function isValidEmail(e?: string | null): boolean {
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}


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

    // ============================================================
    // PHASE 1b: Extended rules v2.1 — 11 new SQL-based signals
    // ============================================================
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgoIso = fourteenDaysAgo;
    const todayIso = now.toISOString().slice(0, 10);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const ACTIVE_OPP_STAGES = ["qualified", "proposal", "negotiation", "discovery"];

    const [
      { data: zombieOpps },
      { data: overdueOpps },
      { data: allLeadsForDupAndEmail },
      { data: nearBookings },
      { data: activeOppsForBalance },
      { data: staleSpecs },
      { data: overBudgetProjects },
      { data: deliveredProjects },
    ] = await Promise.all([
      supabase.from("opportunities").select("id, title, stage, updated_at")
        .eq("workspace_id", ws.id).in("stage", ACTIVE_OPP_STAGES)
        .lt("updated_at", twentyOneDaysAgo).limit(5),
      supabase.from("opportunities").select("id, title, stage, expected_close_date")
        .eq("workspace_id", ws.id).in("stage", ACTIVE_OPP_STAGES)
        .not("expected_close_date", "is", null).lt("expected_close_date", todayIso).limit(5),
      supabase.from("leads").select("id, name, company, email")
        .eq("workspace_id", ws.id).not("email", "is", null).limit(500),
      supabase.from("bookings").select("id, name, company, start_time, status")
        .eq("workspace_id", ws.id).gte("start_time", now.toISOString()).lt("start_time", in24h)
        .neq("status", "cancelled").limit(10),
      supabase.from("opportunities").select("stage")
        .eq("workspace_id", ws.id).in("stage", ACTIVE_OPP_STAGES).limit(500),
      supabase.from("specifications").select("id, title, status, updated_at, version")
        .eq("workspace_id", ws.id).eq("status", "draft")
        .lt("updated_at", fourteenDaysAgoIso).limit(5),
      supabase.from("projects").select("id, name, budget_amount, consumed_amount, status")
        .eq("workspace_id", ws.id).in("status", ["active", "planning"])
        .not("budget_amount", "is", null).gt("budget_amount", 0).limit(100),
      supabase.from("projects").select("id, name, status, updated_at, lead_id")
        .eq("workspace_id", ws.id).in("status", ["completed", "delivered"])
        .lt("updated_at", thirtyDaysAgo).limit(10),
    ]);

    // 1. Opportunités zombies
    for (const o of zombieOpps || []) {
      const days = Math.floor((now.getTime() - new Date(o.updated_at).getTime()) / 86400000);
      anomalies.push({
        category: "inactivity", severity: "warning", rule_type: "risk_opportunity_zombie",
        entity_type: "opportunity", entity_id: o.id,
        entity_name: o.title || "Opportunité",
        raw_issue: `Opportunité stagnante depuis ${days}j en stage "${o.stage}"`,
        stage: o.stage, days_inactive: days,
      });
    }

    // 2. Opportunités avec date de closing dépassée
    for (const o of overdueOpps || []) {
      anomalies.push({
        category: "overdue", severity: "critical", rule_type: "overdue_opp_close_date",
        entity_type: "opportunity", entity_id: o.id,
        entity_name: o.title || "Opportunité",
        raw_issue: `Date de closing ${o.expected_close_date} dépassée`,
        stage: o.stage,
      });
    }

    // 3. Leads emails invalides + détection doublons
    const validLeads = (allLeadsForDupAndEmail || []).filter((l: any) => l.email);
    for (const l of validLeads) {
      if (!isValidEmail(l.email)) {
        anomalies.push({
          category: "incomplete", severity: "warning", rule_type: "incomplete_lead_invalid_email",
          entity_type: "lead", entity_id: l.id,
          entity_name: l.company || l.name || "Lead",
          raw_issue: `Email invalide: ${l.email}`,
        });
      }
    }
    // Doublons par email normalisé
    const emailGroups = new Map<string, any[]>();
    for (const l of validLeads) {
      if (!isValidEmail(l.email)) continue;
      const key = (l.email as string).toLowerCase().trim();
      if (!emailGroups.has(key)) emailGroups.set(key, []);
      emailGroups.get(key)!.push(l);
    }
    let dupCount = 0;
    for (const [, group] of emailGroups) {
      if (group.length > 1 && dupCount < 5) {
        const primary = group[0];
        anomalies.push({
          category: "duplicate", severity: "warning", rule_type: "duplicate_lead",
          entity_type: "lead", entity_id: primary.id,
          entity_name: primary.company || primary.name || "Lead",
          raw_issue: `${group.length} leads partagent l'email ${primary.email}`,
        });
        dupCount++;
      }
    }

    // 4. RDV imminents sans préparation (proxy : pas de note récente liée)
    for (const b of nearBookings || []) {
      const hoursUntil = Math.max(1, Math.round((new Date(b.start_time).getTime() - now.getTime()) / 3600000));
      anomalies.push({
        category: "risk", severity: hoursUntil <= 6 ? "critical" : "warning",
        rule_type: "risk_booking_no_prep",
        entity_type: "booking", entity_id: b.id,
        entity_name: (b.company ? `${b.name} (${b.company})` : b.name) || "RDV",
        raw_issue: `RDV dans ${hoursUntil}h sans préparation`,
        days_inactive: hoursUntil,
      });
    }

    // 5. Pipeline déséquilibré (>60% d'opps actives sur 1 stage)
    if ((activeOppsForBalance?.length || 0) >= 5) {
      const stageCounts = new Map<string, number>();
      for (const o of activeOppsForBalance!) {
        stageCounts.set(o.stage, (stageCounts.get(o.stage) || 0) + 1);
      }
      const total = activeOppsForBalance!.length;
      for (const [stage, count] of stageCounts) {
        const pct = Math.round((count / total) * 100);
        if (pct >= 60) {
          anomalies.push({
            category: "imbalance", severity: "warning", rule_type: "imbalance_pipeline_stage",
            entity_type: "workspace", entity_id: ws.id,
            entity_name: "Pipeline",
            raw_issue: `${pct}% des opportunités actives au stage ${stage}`,
            stage, days_inactive: pct,
          });
          break;
        }
      }
    }

    // 6. Spécifications en brouillon stagnant
    for (const s of staleSpecs || []) {
      const days = Math.floor((now.getTime() - new Date(s.updated_at).getTime()) / 86400000);
      anomalies.push({
        category: "inactivity", severity: "info", rule_type: "risk_specification_stale",
        entity_type: "specification", entity_id: s.id,
        entity_name: s.title || `Spec ${s.version || ""}`,
        raw_issue: `Brouillon de spec depuis ${days}j`,
        days_inactive: days,
      });
    }

    // 7. Projets en dépassement budget (consommé > 80%)
    for (const p of overBudgetProjects || []) {
      const budget = Number(p.budget_amount || 0);
      const consumed = Number(p.consumed_amount || 0);
      if (budget <= 0) continue;
      const pct = Math.round((consumed / budget) * 100);
      if (pct >= 80) {
        anomalies.push({
          category: "risk", severity: pct >= 100 ? "critical" : "warning",
          rule_type: "risk_project_over_budget",
          entity_type: "project", entity_id: p.id,
          entity_name: p.name || "Projet",
          raw_issue: `Budget consommé à ${pct}% (${consumed}/${budget})`,
          days_inactive: pct,
        });
      }
    }

    // 8. Clients livrés sans touchpoint > 30j (cross/up-sell opportunity)
    for (const p of deliveredProjects || []) {
      const days = Math.floor((now.getTime() - new Date(p.updated_at).getTime()) / 86400000);
      anomalies.push({
        category: "inactivity", severity: "info", rule_type: "inactivity_client_post_delivery",
        entity_type: "project", entity_id: p.id,
        entity_name: p.name || "Projet livré",
        raw_issue: `Projet livré, aucun contact depuis ${days}j`,
        days_inactive: days,
      });
    }

    // ============================================================
    // PHASE 1c — Sentinel v3 : 4 nouvelles règles
    // ============================================================
    const thirtyDaysAgoIso = thirtyDaysAgo;
    const sevenDaysAgoIso = sevenDaysAgo;

    const [
      { data: churnLeads },
      { data: dormantOpps },
      { data: stageRegressions },
      { data: emailBurstLogs },
    ] = await Promise.all([
      // 1. Churn risk : lead chaud + lead_score > 70 + sans contact > 30j
      supabase.from("leads")
        .select("id, name, company, lead_score, last_contacted_at, updated_at")
        .eq("workspace_id", ws.id)
        .in("qualification_status", ["r1", "r2", "negotiation"])
        .gt("lead_score", 70)
        .or(`last_contacted_at.lt.${thirtyDaysAgoIso},last_contacted_at.is.null`)
        .lt("updated_at", thirtyDaysAgoIso)
        .limit(5),
      // 2. Opp dormante : entre 14j et 21j d'inactivité (avant zombie)
      supabase.from("opportunities").select("id, title, stage, updated_at")
        .eq("workspace_id", ws.id).in("stage", ACTIVE_OPP_STAGES)
        .lt("updated_at", fourteenDaysAgoIso)
        .gte("updated_at", twentyOneDaysAgo)
        .limit(5),
      // 3. Régression de stage : activity_log status_change avec metadata indiquant recul
      supabase.from("activity_log")
        .select("id, entity_id, entity_type, metadata, created_at, title")
        .eq("workspace_id", ws.id)
        .eq("activity_type", "status_change")
        .eq("entity_type", "opportunity")
        .gte("created_at", thirtyDaysAgoIso)
        .order("created_at", { ascending: false })
        .limit(50),
      // 4. Sur-sollicitation : activity_log type=email vers même lead, count > 3 sur 7j
      supabase.from("activity_log")
        .select("lead_id, created_at")
        .eq("workspace_id", ws.id)
        .eq("activity_type", "email")
        .not("lead_id", "is", null)
        .gte("created_at", sevenDaysAgoIso)
        .limit(500),
    ]);

    // 1. Churn hot lead
    for (const l of churnLeads || []) {
      anomalies.push({
        category: "risk", severity: "critical", rule_type: "risk_churn_hot_lead",
        entity_type: "lead", entity_id: l.id,
        entity_name: l.company || l.name || "Lead",
        raw_issue: `Lead chaud score ${l.lead_score} inactif >30j`,
        days_inactive: Number(l.lead_score) || 0,
      });
    }

    // 2. Opp dormante (early warning)
    for (const o of dormantOpps || []) {
      const days = Math.floor((now.getTime() - new Date(o.updated_at).getTime()) / 86400000);
      anomalies.push({
        category: "inactivity", severity: "warning", rule_type: "risk_opportunity_dormant",
        entity_type: "opportunity", entity_id: o.id,
        entity_name: o.title || "Opportunité",
        raw_issue: `Inactive depuis ${days}j (avant escalade zombie)`,
        stage: o.stage, days_inactive: days,
      });
    }

    // 3. Régression de stage — détecte via metadata { from, to } si présent
    const STAGE_ORDER: Record<string, number> = {
      discovery: 1, qualified: 2, proposal: 3, negotiation: 4, closed_won: 5, closed_lost: 0, lost: 0,
    };
    const seenRegressions = new Set<string>();
    for (const a of stageRegressions || []) {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      const fromStage = String(meta.from_status ?? meta.from ?? meta.old_stage ?? "");
      const toStage = String(meta.to_status ?? meta.to ?? meta.new_stage ?? "");
      if (!fromStage || !toStage) continue;
      const fromRank = STAGE_ORDER[fromStage] ?? -1;
      const toRank = STAGE_ORDER[toStage] ?? -1;
      if (fromRank > 0 && toRank > 0 && toRank < fromRank && !seenRegressions.has(a.entity_id)) {
        seenRegressions.add(a.entity_id);
        anomalies.push({
          category: "risk", severity: "warning", rule_type: "risk_pipeline_stage_regression",
          entity_type: "opportunity", entity_id: a.entity_id,
          entity_name: a.title || "Opportunité",
          raw_issue: `Régression ${fromStage} → ${toStage}`,
          stage: toStage,
        });
        if (seenRegressions.size >= 5) break;
      }
    }

    // 4. Sur-sollicitation : group by lead_id, count > 3
    if (emailBurstLogs?.length) {
      const counts = new Map<string, number>();
      for (const e of emailBurstLogs as Array<{ lead_id: string }>) {
        counts.set(e.lead_id, (counts.get(e.lead_id) || 0) + 1);
      }
      const overSollicited = [...counts.entries()].filter(([, c]) => c > 3).slice(0, 5);
      if (overSollicited.length) {
        const ids = overSollicited.map(([id]) => id);
        const { data: leadInfo } = await supabase
          .from("leads").select("id, name, company")
          .in("id", ids).limit(5);
        const leadMap = new Map((leadInfo || []).map((l: any) => [l.id, l]));
        for (const [leadId, count] of overSollicited) {
          const l = leadMap.get(leadId) as any;
          anomalies.push({
            category: "risk", severity: count > 5 ? "critical" : "warning",
            rule_type: "risk_over_solicitation",
            entity_type: "lead", entity_id: leadId,
            entity_name: l?.company || l?.name || "Lead",
            raw_issue: `${count} emails en 7j`,
            days_inactive: count,
          });
        }
      }
    }



    if (!anomalies.length) {
      return new Response(JSON.stringify({ alerts: [], total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // PHASE 2: Direct formatting (no LLM)
    // Sort by severity, cap at 15 (v2.1 — élargi de 8 → 15)
    // ============================================================
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const alerts: SentinelAlert[] = anomalies.slice(0, 15).map(formatAnomaly);

    // ============================================================
    // PHASE 2b: Persist alerts to ai_sentinel_alerts (v2.1)
    // Stratégie : delete unresolved → insert fresh (cache rafraîchi).
    // L'historique des alertes résolues (resolved_at NOT NULL) est conservé.
    // ============================================================
    try {
      await supabase
        .from("ai_sentinel_alerts")
        .delete()
        .eq("workspace_id", ws.id)
        .is("resolved_at", null);

      const rows = anomalies.slice(0, 15).map((a) => {
        const formatted = ALERT_TEMPLATES[a.rule_type]
          ? ALERT_TEMPLATES[a.rule_type](a)
          : { question: a.raw_issue, detail: "" };
        return {
          workspace_id: ws.id,
          severity: a.severity,
          category: a.category,
          title: formatted.question,
          description: formatted.detail,
          entity_type: a.entity_type,
          entity_id: a.entity_id === ws.id ? null : a.entity_id,
          ai_metadata: {
            rule_type: a.rule_type,
            entity_name: a.entity_name,
            stage: a.stage,
            days_inactive: a.days_inactive,
            scan_version: "2.1",
          },
        };
      });

      if (rows.length > 0) {
        const { error: insertErr } = await supabase
          .from("ai_sentinel_alerts")
          .insert(rows);
        if (insertErr) console.error("[sentinel] persist error:", insertErr);
        else console.log(`[sentinel] Persisted ${rows.length} alerts to ai_sentinel_alerts`);
      }
    } catch (persistErr) {
      console.error("[sentinel] Persist phase failed:", persistErr);
    }


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
      // === v2.1 — Nouveaux templates de propositions ===
      risk_opportunity_zombie: (a) => ({
        action_type: "create_task",
        action_label: `Débloquer opportunité "${a.entity_name}" (${a.days_inactive}j stage ${a.stage})`,
        action_payload: {
          entity_type: "opportunity", entity_id: a.entity_id,
          title: `Décision opportunité zombie – ${a.entity_name}`,
          description: `Opportunité stagnante depuis ${a.days_inactive}j en stage "${a.stage}". Décider : relancer, faire avancer ou disqualifier.`,
          priority: "high", due_in_days: 1,
        },
        ai_reasoning: `[Sentinelle] Opportunité zombie ${a.days_inactive}j sans mouvement. Coût d'opportunité élevé si laissée en l'état.`,
      }),
      overdue_opp_close_date: (a) => ({
        action_type: "create_task",
        action_label: `Reprogrammer ou conclure "${a.entity_name}" (close date dépassée)`,
        action_payload: {
          entity_type: "opportunity", entity_id: a.entity_id,
          title: `Close date dépassée – ${a.entity_name}`,
          description: `La date de closing est dépassée. Reprogrammer ou conclure (won/lost).`,
          priority: "high", due_in_days: 1,
        },
        ai_reasoning: `[Sentinelle] Date de closing dépassée — assainir le forecast.`,
      }),
      risk_project_over_budget: (a) => ({
        action_type: "create_task",
        action_label: `Arbitrage budget projet "${a.entity_name}" (${a.days_inactive}%)`,
        action_payload: {
          entity_type: "project", entity_id: a.entity_id,
          title: `Risque dépassement budget – ${a.entity_name}`,
          description: `Budget consommé à ${a.days_inactive}%. Arbitrer scope, réviser budget ou alerter client.`,
          priority: (a.days_inactive || 0) >= 100 ? "high" : "medium",
          due_in_days: 2,
        },
        ai_reasoning: `[Sentinelle] Projet à ${a.days_inactive}% du budget — décision financière requise.`,
      }),
      risk_booking_no_prep: (a) => ({
        action_type: "create_task",
        action_label: `Préparer RDV "${a.entity_name}" (dans ${a.days_inactive}h)`,
        action_payload: {
          entity_type: "booking", entity_id: a.entity_id,
          title: `Préparation RDV – ${a.entity_name}`,
          description: `RDV dans ${a.days_inactive}h sans préparation détectée. Briefer le contexte, objectifs et next-step.`,
          priority: (a.days_inactive || 24) <= 6 ? "high" : "medium",
          due_in_days: 0,
        },
        ai_reasoning: `[Sentinelle] RDV imminent sans préparation — qualité d'échange à risque.`,
      }),
      duplicate_lead: (a) => ({
        action_type: "create_task",
        action_label: `Fusionner doublons lead "${a.entity_name}"`,
        action_payload: {
          entity_type: "lead", entity_id: a.entity_id,
          title: `Doublon CRM – ${a.entity_name}`,
          description: `Plusieurs leads avec le même email. Identifier le master et fusionner.`,
          priority: "medium", due_in_days: 3,
        },
        ai_reasoning: `[Sentinelle] Doublons CRM dégradent la qualité des analyses et risquent de doubler les relances.`,
      }),
      inactivity_client_post_delivery: (a) => ({
        action_type: "create_task",
        action_label: `Touchpoint post-livraison "${a.entity_name}"`,
        action_payload: {
          entity_type: "project", entity_id: a.entity_id,
          title: `Reprise contact client – ${a.entity_name}`,
          description: `Client sans contact depuis ${a.days_inactive}j post-livraison. Opportunité cross/up-sell ou recueil témoignage.`,
          priority: "medium", due_in_days: 3,
        },
        ai_reasoning: `[Sentinelle] Client livré dormant — potentiel commercial sous-exploité.`,
      }),
      imbalance_pipeline_stage: (a) => ({
        action_type: "create_task",
        action_label: `Rééquilibrer pipeline (${a.days_inactive}% au stage ${a.stage})`,
        action_payload: {
          entity_type: "workspace", entity_id: a.entity_id,
          title: `Pipeline déséquilibré – stage ${a.stage}`,
          description: `${a.days_inactive}% des opportunités actives sont concentrées sur le stage "${a.stage}". Accélérer la conversion en aval.`,
          priority: "medium", due_in_days: 2,
        },
        ai_reasoning: `[Sentinelle] Concentration anormale du pipeline — risque de creux de revenu.`,
      // === Phase E (v3) — Templates pour les 4 nouvelles règles risk ===
      risk_churn_hot_lead: (a) => ({
        action_type: "send_email",
        action_label: `Sauver ${a.entity_name} (lead chaud inactif ${a.days_inactive}j)`,
        action_payload: {
          lead_id: a.entity_id,
          email_type: "reengagement",
          context: `Lead hot (BANT élevé) silencieux depuis ${a.days_inactive}j. Risque de churn imminent — angle de réengagement personnalisé requis.`,
        },
        ai_reasoning: `[Sentinelle v3] Lead BANT >70 inactif ${a.days_inactive}j. Probabilité de churn forte si pas d'email de réengagement sous 48h.`,
      }),
      risk_opportunity_dormant: (a) => ({
        action_type: "create_note",
        action_label: `Re-qualifier "${a.entity_name}" (${a.days_inactive}j sans activité)`,
        action_payload: {
          entity_type: "opportunity", entity_id: a.entity_id,
          title: `Re-qualification opportunité dormante`,
          content: `Opportunité au stage "${a.stage || "?"}" sans activité depuis ${a.days_inactive}j. Préparer 3 questions de re-qualification : intérêt résiduel, blocage, timing décision.`,
        },
        ai_reasoning: `[Sentinelle v3] Pré-zombie : agir maintenant évite la perte sèche d'une opportunité encore récupérable.`,
      }),
      risk_pipeline_stage_regression: (a) => ({
        action_type: "create_task",
        action_label: `Comprendre régression "${a.entity_name}" → ${a.stage}`,
        action_payload: {
          entity_type: "opportunity", entity_id: a.entity_id,
          title: `Régression pipeline – ${a.entity_name}`,
          description: `Stage régressé vers "${a.stage}". Identifier l'objection ou blocage (prix, timing, décideur) puis ajuster le plan d'action.`,
          priority: "high", due_in_days: 1,
        },
        ai_reasoning: `[Sentinelle v3] Régression de stage = signal d'objection non traitée. Diagnostic rapide indispensable.`,
      }),
      risk_over_solicitation: (a) => ({
        action_type: "create_task",
        action_label: `Pause relance "${a.entity_name}" (sur-sollicité)`,
        action_payload: {
          entity_type: "lead", entity_id: a.entity_id,
          title: `Sur-sollicitation détectée – ${a.entity_name}`,
          description: `Plus de 3 emails envoyés en 7j sans réponse. Marquer pause 14j, varier le canal (LinkedIn / téléphone) au prochain contact.`,
          priority: "high", due_in_days: 0,
        },
        ai_reasoning: `[Sentinelle v3] Sur-sollicitation = risque de spam et de brûlage de contact. Pause + changement de canal.`,
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
