/**
 * Cockpit Cross-Signal Engine
 * 
 * Découvre des connexions non-triviales entre entités CRM via embeddings (cosine similarity):
 *   - opportunity_acceleration: opp stagnante + partner pertinent par similarité sémantique
 *   - lead_partner_competence: lead chaud sans opp + partner expert détecté
 *   - solution_match: lead avec solution recommandée par embeddings
 * 
 * Cron quotidien 06:00 UTC. TTL 7j. Refresh idempotent par workspace.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGNATION_DAYS = 7;
const MIN_SIMILARITY_PARTNER = 0.55;
const MIN_SIMILARITY_SOLUTION = 0.60;
const MAX_SIGNALS_PER_WORKSPACE = 15;

interface CrossSignal {
  workspace_id: string;
  signal_type: string;
  title: string;
  narrative: string;
  score: number;
  entities: Array<{ type: string; id: string; name: string; role?: string }>;
  severity: 'low' | 'medium' | 'high';
  evidence: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetWorkspaceId: string | undefined = body.workspace_id;

    // List workspaces to process
    let workspaceIds: string[];
    if (targetWorkspaceId) {
      workspaceIds = [targetWorkspaceId];
    } else {
      const { data: workspaces } = await supabase.from('workspaces').select('id');
      workspaceIds = (workspaces || []).map((w: any) => w.id);
    }

    const results: Record<string, { signals: number; error?: string }> = {};

    for (const workspaceId of workspaceIds) {
      try {
        const signals = await computeWorkspaceSignals(supabase, workspaceId);
        // Refresh: delete active expired or stale + insert fresh
        await supabase.from('ai_cross_signals')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('status', 'active');

        if (signals.length > 0) {
          const toInsert = signals.slice(0, MAX_SIGNALS_PER_WORKSPACE);
          const { error: insertError } = await supabase.from('ai_cross_signals').insert(toInsert);
          if (insertError) throw insertError;
        }
        results[workspaceId] = { signals: signals.length };
      } catch (err) {
        results[workspaceId] = { signals: 0, error: err instanceof Error ? err.message : String(err) };
      }
    }

    return new Response(JSON.stringify({ success: true, processed: workspaceIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('[cross-signal-engine] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function computeWorkspaceSignals(supabase: any, workspaceId: string): Promise<CrossSignal[]> {
  const signals: CrossSignal[] = [];

  // 1. Opportunités stagnantes (> 7j dans même stage, hors won/lost)
  const cutoff = new Date(Date.now() - STAGNATION_DAYS * 86400000).toISOString();
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, lead_id, value_amount, stage, stage_entered_at, leads(id, name, company)')
    .eq('workspace_id', workspaceId)
    .not('stage', 'in', '(won,lost,closed_won,closed_lost)')
    .lte('stage_entered_at', cutoff)
    .not('lead_id', 'is', null)
    .order('value_amount', { ascending: false, nullsFirst: false })
    .limit(20);

  for (const opp of opps || []) {
    const lead = opp.leads;
    if (!lead?.id) continue;
    const leadLabel = lead.name || lead.company || 'Lead';
    const stagnationDays = Math.floor((Date.now() - new Date(opp.stage_entered_at).getTime()) / 86400000);

    // Match partners via embeddings
    const { data: partners, error: pErr } = await supabase.rpc('match_partners_for_lead', {
      p_lead_id: lead.id,
      p_workspace_id: workspaceId,
      p_limit: 2,
    });
    if (pErr) {
      console.error('[cross-signal] match_partners err', pErr);
      continue;
    }

    const topPartner = (partners || []).find((p: any) => p.similarity >= MIN_SIMILARITY_PARTNER);
    if (topPartner) {
      const value = Number(opp.value_amount) || 0;
      const score = topPartner.similarity * Math.log10(Math.max(value, 1000) / 100) * Math.min(stagnationDays / 7, 3);
      signals.push({
        workspace_id: workspaceId,
        signal_type: 'opportunity_acceleration',
        title: `${leadLabel} → ${topPartner.partner_name} pour débloquer "${opp.title}"`,
        narrative: `L'opportunité "${opp.title}" (${value.toLocaleString('fr-FR')} €, stage ${opp.stage}) stagne depuis ${stagnationDays} jours. Le partenaire ${topPartner.partner_name} présente une affinité sémantique forte (${(topPartner.similarity * 100).toFixed(0)}%) avec ce lead. Proposer une mise en relation pour accélérer la conversion.`,
        score,
        entities: [
          { type: 'opportunity', id: opp.id, name: opp.title, role: 'cible' },
          { type: 'lead', id: lead.id, name: leadLabel, role: 'contact' },
          { type: 'partner', id: topPartner.partner_id, name: topPartner.partner_name, role: 'expert recommandé' },
        ],
        severity: value > 10000 || stagnationDays > 21 ? 'high' : 'medium',
        evidence: {
          stagnation_days: stagnationDays,
          similarity: topPartner.similarity,
          opportunity_value: value,
          stage: opp.stage,
        },
      });
    }

    // Match solutions
    const { data: solutions, error: sErr } = await supabase.rpc('match_solutions_for_lead', {
      p_lead_id: lead.id,
      p_limit: 1,
    });
    if (sErr) continue;
    const topSolution = (solutions || []).find((s: any) => s.similarity >= MIN_SIMILARITY_SOLUTION);
    if (topSolution) {
      const value = Number(opp.value_amount) || 0;
      signals.push({
        workspace_id: workspaceId,
        signal_type: 'solution_match',
        title: `Solution "${topSolution.solution_name}" pertinente pour ${leadLabel}`,
        narrative: `La solution "${topSolution.solution_name}" matche sémantiquement (${(topSolution.similarity * 100).toFixed(0)}%) le contexte de ${leadLabel}. Opportunité "${opp.title}" en stage ${opp.stage} depuis ${stagnationDays}j — proposer cette solution comme angle de relance.`,
        score: topSolution.similarity * 2,
        entities: [
          { type: 'lead', id: lead.id, name: leadLabel, role: 'cible' },
          { type: 'solution', id: topSolution.solution_id, name: topSolution.solution_name, role: 'recommandation' },
          { type: 'opportunity', id: opp.id, name: opp.title, role: 'contexte' },
        ],
        severity: 'medium',
        evidence: { similarity: topSolution.similarity, stagnation_days: stagnationDays },
      });
    }
  }

  // 2. Leads chauds sans opportunité avec partner match
  const { data: hotLeads } = await supabase
    .from('leads')
    .select('id, full_name, company, status, score, created_at')
    .eq('workspace_id', workspaceId)
    .in('status', ['qualified', 'hot', 'warm', 'new'])
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .order('score', { ascending: false, nullsFirst: false })
    .limit(10);

  const { data: leadsWithOpps } = await supabase
    .from('opportunities')
    .select('lead_id')
    .eq('workspace_id', workspaceId);
  const oppLeadIds = new Set((leadsWithOpps || []).map((o: any) => o.lead_id));

  for (const lead of hotLeads || []) {
    if (oppLeadIds.has(lead.id)) continue;
    const leadLabel = lead.full_name || lead.company || 'Lead';
    const { data: partners } = await supabase.rpc('match_partners_for_lead', {
      p_lead_id: lead.id,
      p_workspace_id: workspaceId,
      p_limit: 1,
    });
    const topPartner = (partners || []).find((p: any) => p.similarity >= MIN_SIMILARITY_PARTNER);
    if (!topPartner) continue;

    signals.push({
      workspace_id: workspaceId,
      signal_type: 'lead_partner_competence',
      title: `Lead chaud sans opp + match partner: ${leadLabel} ↔ ${topPartner.partner_name}`,
      narrative: `${leadLabel} (score ${lead.score || 'N/A'}, statut ${lead.status}) n'a pas encore d'opportunité ouverte. Le partenaire ${topPartner.partner_name} matche sémantiquement (${(topPartner.similarity * 100).toFixed(0)}%) — créer une opp avec mise en relation.`,
      score: topPartner.similarity * 1.5 * (Number(lead.score) || 50) / 50,
      entities: [
        { type: 'lead', id: lead.id, name: leadLabel, role: 'cible' },
        { type: 'partner', id: topPartner.partner_id, name: topPartner.partner_name, role: 'expert' },
      ],
      severity: 'medium',
      evidence: { similarity: topPartner.similarity, lead_score: lead.score, lead_status: lead.status },
    });
  }

  // Sort by score descending, dedupe similar entities
  signals.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = signals.filter((s) => {
    const key = s.entities.map((e) => `${e.type}:${e.id}`).sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}
