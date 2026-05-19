// Edge fn: ai-action-artifact-generator
// Étape 2.3 Vague 2 — Génère un brouillon (email/note) pré-rédigé pour une ai_action.
// Idempotent : si artifact déjà ready/edited/sent, retourne tel quel sauf force=true.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callLLM } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type ArtifactType = "email" | "note";

interface ReqBody {
  ai_action_id: string;
  force?: boolean;
}

// Heuristique : déduire le type d'artefact à partir du texte de l'action
function inferArtifactType(actionText: string, entityType?: string): ArtifactType {
  const t = (actionText || "").toLowerCase();
  if (/\b(email|mail|relanc|envoy|écrire|ecrire|message|courriel)\b/.test(t)) return "email";
  if (/\b(devis|proposition|propal|offre|tarif|chiffrage)\b/.test(t)) return "email";
  if (entityType === "lead" || entityType === "opportunity") return "email";
  return "note";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { ai_action_id, force }: ReqBody = await req.json();

    if (!ai_action_id) {
      return new Response(JSON.stringify({ error: "ai_action_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer l'action
    const { data: action, error: actionErr } = await supabase
      .from("ai_actions")
      .select("id, workspace_id, action_text, reasoning, entity_type, entity_id, entity_name, urgency, artifact, artifact_status")
      .eq("id", ai_action_id)
      .maybeSingle();

    if (actionErr || !action) {
      return new Response(JSON.stringify({ error: "action_not_found", details: actionErr?.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotence
    if (!force && action.artifact && ["ready", "edited", "sent"].includes(action.artifact_status)) {
      return new Response(JSON.stringify({
        ok: true,
        cached: true,
        artifact: action.artifact,
        artifact_type: action.artifact?.type,
        artifact_status: action.artifact_status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Marquer en cours
    await supabase.from("ai_actions").update({ artifact_status: "generating" }).eq("id", ai_action_id);

    const artifactType = inferArtifactType(action.action_text || "", action.entity_type || undefined);

    // Contexte entité (léger)
    let entityCtx: Record<string, unknown> = {};
    let recipientEmail: string | null = null;
    let recipientName: string | null = null;

    if (action.entity_type === "lead" && action.entity_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, company, email, status, lead_score, ai_documents_summary")
        .eq("id", action.entity_id)
        .maybeSingle();
      if (lead) {
        entityCtx = lead;
        recipientEmail = lead.email || null;
        recipientName = lead.name || lead.company || null;
      }
    } else if (action.entity_type === "opportunity" && action.entity_id) {
      const { data: opp } = await supabase
        .from("opportunities")
        .select("title, stage, value_amount, probability, expected_close_date, lead_id")
        .eq("id", action.entity_id)
        .maybeSingle();
      if (opp) {
        entityCtx = opp;
        if (opp.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("name, company, email")
            .eq("id", opp.lead_id)
            .maybeSingle();
          if (lead) {
            recipientEmail = lead.email || null;
            recipientName = lead.name || lead.company || null;
            (entityCtx as any).contact = { name: lead.name, company: lead.company };
          }
        }
      }
    } else if (action.entity_type === "project" && action.entity_id) {
      const { data: prj } = await supabase
        .from("projects")
        .select("name, status, health_status, budget_amount, consumed_amount, planned_end_date, ai_documents_summary")
        .eq("id", action.entity_id)
        .maybeSingle();
      if (prj) entityCtx = prj;
    }

    // Prompt système court (artefact = livrable, pas analyse)
    const systemPrompt = artifactType === "email"
      ? `Tu es Nicolas Lara, Architecte IA chez IArche (Bayonne). Tu rédiges des emails commerciaux COURTS (<150 mots), professionnels, en vouvoiement.
RÈGLES :
- Sujet percutant (max 70 caractères)
- 1 CTA unique et concret
- Pas de superlatifs marketing creux
- Signature : "Nicolas Lara, Architecte IA — IArche"
- Réponds STRICTEMENT en JSON : {"subject":"...","body":"...","cta":"..."}
- Aucun texte hors JSON.`
      : `Tu es l'assistant Cockpit IArche. Tu rédiges des notes internes CRM concises (3-8 lignes) pour préparer une action ou consigner un contexte.
RÈGLES :
- Style direct, factuel
- Liste à puces si pertinent
- Réponds STRICTEMENT en JSON : {"title":"...","content":"..."}
- Aucun texte hors JSON.`;

    const userPrompt = `## Action IA recommandée\n${action.action_text}\n\n## Pourquoi (raisonnement IA)\n${action.reasoning || "—"}\n\n## Entité ciblée (${action.entity_type || "?"} — ${action.entity_name || "?"})\n${JSON.stringify(entityCtx, null, 2)}\n\n## Tâche\nGénère le ${artifactType === "email" ? "brouillon d'email" : "brouillon de note"} prêt à éditer/envoyer. JSON uniquement.`;

    let raw: string;
    try {
      raw = await callLLM(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { functionName: "ai-action-artifact-generator", workspaceId: action.workspace_id },
      );
    } catch (e) {
      await supabase.from("ai_actions").update({ artifact_status: "failed" }).eq("id", ai_action_id);
      return new Response(JSON.stringify({ error: "llm_failed", message: (e as Error).message }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      await supabase.from("ai_actions").update({ artifact_status: "failed" }).eq("id", ai_action_id);
      return new Response(JSON.stringify({ error: "invalid_llm_json", raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const artifactPayload = {
      type: artifactType,
      ...parsed,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      generated_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("ai_actions")
      .update({
        artifact: artifactPayload,
        artifact_type: artifactType,
        artifact_status: "ready",
        artifact_generated_at: new Date().toISOString(),
        artifact_model: "gemini-2.5-flash",
      })
      .eq("id", ai_action_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: "update_failed", message: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      cached: false,
      artifact: artifactPayload,
      artifact_type: artifactType,
      artifact_status: "ready",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[artifact-generator] error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
