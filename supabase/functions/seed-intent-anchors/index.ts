// Phase C — Seed des ancres d'intent (one-shot, idempotent admin-only)
// Génère les embeddings via Lovable AI (openai/text-embedding-3-small, 1536d)
// et insère/met à jour les phrases canoniques dans ai_intent_anchors.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANCHORS: Record<string, string[]> = {
  crm_query: [
    "quels sont mes leads chauds",
    "montre-moi l'opportunité",
    "liste mes contacts",
    "score BANT de ce lead",
    "leads non contactés cette semaine",
    "où en est l'opportunité Bayonne",
    "qualifie ce contact",
    "mes 5 prochains rendez-vous",
    "détail de l'opportunité",
    "fiche lead complète",
  ],
  doc_generation: [
    "génère un devis",
    "rédige une proposition commerciale",
    "fais-moi un email de relance",
    "crée un cahier des charges",
    "rédige un email à",
    "génère le CDC pour ce projet",
    "écris un mail de prospection",
    "prépare une proposition",
    "rédige le devis pour l'opportunité",
    "génère un email de suivi",
  ],
  analysis: [
    "fais un point sur ce lead",
    "synthèse 360 de cette opportunité",
    "analyse cette transcription",
    "analyse ce meeting",
    "audit de mon pipeline",
    "analyse stratégique de la deal",
    "analyse le RDV de ce matin",
    "que penses-tu de ce deal",
    "résume cette réunion",
    "diagnostic commercial du trimestre",
  ],
  vivier: [
    "lance une campagne Instantly",
    "ajoute au vivier biotech",
    "prospection B2B sur Paris",
    "trouve-moi des prospects santé",
    "lance une séquence email vivier",
    "campagne de prospection automatisée",
    "ajouter des contacts au vivier",
    "lancer une cold email campaign",
  ],
  general: [
    "salut",
    "bonjour",
    "merci",
    "comment ça va",
    "que peux-tu faire",
    "aide",
    "qu'est-ce qu'IArche",
    "explique-moi ton fonctionnement",
    "qui es-tu",
    "comment tu marches",
  ],
};

async function embed(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
      dimensions: 1536,
    }),
  });
  if (!resp.ok) throw new Error(`embed ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return json.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [intent, phrases] of Object.entries(ANCHORS)) {
    for (const text of phrases) {
      try {
        // Skip if already exists with embedding
        const { data: existing } = await supabase
          .from("ai_intent_anchors")
          .select("id, embedding")
          .eq("intent", intent)
          .eq("text", text)
          .maybeSingle();

        if (existing?.embedding) {
          skipped++;
          continue;
        }

        const vector = await embed(text, apiKey);
        const embeddingStr = `[${vector.join(",")}]`;

        if (existing) {
          await supabase
            .from("ai_intent_anchors")
            .update({ embedding: embeddingStr })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("ai_intent_anchors")
            .insert({ intent, text, embedding: embeddingStr });
        }
        inserted++;
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        errors.push(`${intent}/${text}: ${(e as Error).message}`);
      }
    }
  }

  return new Response(
    JSON.stringify({ inserted, skipped, errors, total: inserted + skipped }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
